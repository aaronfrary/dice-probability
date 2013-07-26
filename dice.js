/*
 Copyright 2013 Aaron Graham-Horowitz

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Usage:
 Output goes to <div id="diceplot"></div>.
 Draw PMF by calling makePlot(dist, funcname, dicestring, *setstring)
 where dist is 'PDF', 'CDF', or 'CCDF', funcname is 'Sum', 'Min', or 'Max',
 and dicestring denotes the dice to roll e.g. '3d6, 1d20'.
 setstring is an optional argument needed to consider the number of dice
 whose rolls are contained within a set of integers.
*/
$(function() {
  "use strict"

  /* STRING PARSING */

  // Parse string to get the dice we want to roll.
  function getDice(s) {
    var pattern=/\d*d\d+/ig;
    var dice = [];
    dice.minroll = 0;
    dice.stringform = "";
    var die, roll;
    while ((roll=pattern.exec(s)) !== null)
    {
      die = roll[0].toLowerCase().split('d');
      if (die[0] === '')
        die[0] = 1;
      else
        die[0] = parseInt(die[0]);
      die[1] = parseInt(die[1]);
      dice.minroll += die[0];
      dice.stringform += die[0] + "d" + die[1] + ", ";
      dice.push(die);
    }
    dice.stringform = dice.stringform.slice(0, -2); // drop last ', '
    return dice;
  }

  // Parse string to get a set of unique integers in increasing order.
  // Can accept individual numbers and ranges such as 4-6.
  function getSet(s) {
    var rangepatt=/\d+-\d+/ig;
    var patt=/\d+/ig;
    var set = [];
    set.stringform = " {" + s + "}";   // for display
    var rangestr, rg, low, high, eltstr, elt
    // Get all ranges first
    while ((rangestr=rangepatt.exec(s)) !== null)
    {
      rg   = rangestr[0].split('-');
      low  = parseInt(rg[0]);
      high = parseInt(rg[1]);
      if (low > high)
        continue;
      for (var i=low; i <= high; i++)
        if ($.inArray(i, set) < 0) set.push(i);
    }
    // Get remaining numbers
    s = s.replace(rangepatt, "");
    while ((eltstr=patt.exec(s)) !== null)
    {
      elt = parseInt(eltstr[0]);
      if ($.inArray(elt, set) < 0)
        set.push(elt);
    }
    // Sort ascending
    return set.sort(function(a,b){return a-b});
  }


  /* BASIC PROBABILITY FUNCTIONS */

  // Probability of rolling an member of ascending-sorted set 'set'
  // on an 'n'-sided die.
  function probInSet(n, set) {
    for (var i=0; i < set.length; i++)
      if (set[i] > n) break;
    return i / n;
  }

  // Return PMF of Binomial distribution (standard algorithm)
  function binomial(n,p) {
    var pmf = [];
    if (p >= 1) {
      for (var i=0; i < n; i++) pmf.push(0);
      pmf.push(1);
      return pmf;
    }
    pmf.push(Math.pow(1-p, n));
    for (var i=1; i <= n; i++)
      pmf.push( pmf[pmf.length-1] * p*(n-i+1) / (i*(1-p)) );
    return pmf;
  }

  // Return PMF of Unif(1,n) (discrete uniform distribution)
  function unif(n) {
    var pmf = []
    for (var i=0; i < n; i++)
      pmf.push(1/n);
    return pmf;
  }

  // Return Cumulative Distribution Function given a PMF
  function getCdf(pmf) {
    var cdf = []
    var cumsum = 0;
    for (var i=0; i < pmf.length; i++) {
      cumsum += pmf[i];
      cdf.push(cumsum);
    }
    return cdf;
  }

  // Return P(X >= x) for X ~ pmf
  // TODO: factor out commonalities with getCdf
  function getSig(pmf) {
    var sig = []
    var cumsum = 1;
    for (var i=0; i < pmf.length; i++) {
      sig.push(cumsum);
      cumsum -= pmf[i];
    }
    return sig;
  }


  /* CALCULATE PMF */

  // Return convolution of two PMFs,
  // if each have support {0...(length - 1)}
  // TODO: Abstract out commonalities between all these silly convo-functions
  function convolute(pmf1, pmf2) {
    var newpmf = [];
    var support = pmf1.length + pmf2.length - 1
    for (var z=0; z < support; z++)
    {
      var cumsum = 0;
      for (var j=0; j <= z; j++)
        if (j < pmf1.length && (z-j) < pmf2.length)
          cumsum += pmf1[j] * pmf2[z-j];
      newpmf.push(cumsum);
    }
    return newpmf;
  }

  // Return convolution of oldpmf with a new die roll
  // NOTE: This is a specialized convolution function
  // not useful outside this context
  function dieConvolute(oldpmf, sides) {
    var pmf = [];
    var support = oldpmf.length + sides - 1;
    var cumsum = 0;
    for (var z=0; z < support; z++)
    {
      if (z < oldpmf.length)
        cumsum += oldpmf[z];
      if (z >= sides)
        cumsum -= oldpmf[z - sides];
      pmf.push(cumsum / sides);
    }
    return pmf;
  }

  // Not actually a convolution... Combines distributions when
  // taking the Max of a random variable and a die roll.
  function convomax(oldpmf, sides) {
    var oldcdf = getCdf(oldpmf);
    var pmf = [];
    var support = Math.max(oldpmf.length, sides);
    var p = 0;
    for (var z=0; z < support; z++)
    {
      if (z < oldpmf.length && z < sides)
        p = (oldpmf[z] * z + oldcdf[z]) / sides;
      else if (z < oldpmf.length)
        p = oldpmf[z];
      else if (z < sides)
        p = 1 / sides;
      pmf.push(p);
    }
    return pmf;
  }

  // Not actually a convolution... Combines distributions when
  // taking the Min of a random variable and a die roll.
  function convomin(oldpmf, sides) {
    var oldsig = getSig(oldpmf);
    var pmf = [];
    var support = Math.min(oldpmf.length, sides);
    var p = 0;
    for (var z=0; z < support; z++)
      pmf.push((oldpmf[z] * (sides - z - 1) + oldsig[z]) / sides);
    return pmf;
  }

  // Function to use for combining distributions depends on whether
  // we are taking the sum, min, or max of the random variables.
  var funcmap = {
    sum : dieConvolute,
    max : convomax,
    min : convomin
  }

  // Return Probability Mass Function over function of dice roll
  function getPmf(funcname, dice) {
    if (funcname === 'inset')
      return getInSetPmf(dice);  // special case
    var sides;
    var pmf = [];
    for (var d=0; d < dice.length; d++) // die type
    {
      sides = dice[d][1];
      for (var r=0; r < dice[d][0]; r++) // times to roll
      {
        if (pmf.length === 0)  // base case
          pmf = unif(sides);
        else
          pmf = funcmap[funcname](pmf, sides);
      }
    }
    return pmf;
  }

  /* This case is a little different but actually simpler:
   * usually we can just return a binomial distribution,
   * for different die types we return a convolution of
   * binomial distributions.
  */
  function getInSetPmf(dice) {
    var pmf = [];
    var rolls, sides, pr, newpmf;
    for (var d=0; d < dice.length; d++) // die type
    {
      rolls = dice[d][0];
      sides = dice[d][1];
      pr = probInSet(sides, dice.set);
      newpmf = binomial(rolls, pr);
      if (pmf.length === 0)
        pmf = newpmf;
      else
        pmf = convolute(pmf, newpmf);
    }
    return pmf;
  }


  /* HIGHCHARTS DISPLAY */

  // General options for display
  Highcharts.setOptions({
    chart: {
      defaultSeriesType: 'column',
      backgroundColor: {
        linearGradient: [-120, 600, 700, 80],
        stops: [
            [0, 'rgb(240, 240, 250)'],
            [1, 'rgb(225, 225, 250)']
            ]
      },
      borderWidth: 2,
      plotBackgroundColor: 'rgba(255, 255, 255, .9)',
      plotShadow: true,
      plotBorderWidth: 1
    },
    plotOptions: {
      column: {     // For histogram
        pointPadding: 0,
        borderWidth: 0.2,
        groupPadding: 0,
        shadow: false
      },
      series: {
        showInLegend: false
      }
    },
    xAxis: {
      allowDecimals: false
    },
    exporting: {
      filename: "dicechart"
    }
  });

  // Call this to draw the plot
  window.makePlot = function(dist, funcname, dicestring, setstring) {
    // Don't run on incomplete info
    if (dicestring.length === 0)
      return;
    if (funcname.toLowerCase() === 'inset' && setstring.length === 0)
      return;
    // Process input
    var dice = getDice(dicestring);
    if (funcname.toLowerCase() === 'inset')
      dice.set = getSet(setstring);
    else {
      dice.set = [];
      dice.set.stringform = "";
    }
    var data = getPmf(funcname.toLowerCase(), dice);
    var yMax, cmpchar;
    if (funcname.toLowerCase() !== 'sum')
      dice.minroll = 1;
    if (funcname.toLowerCase() === 'inset')
      dice.minroll = 0;
    dist = dist.toLowerCase();
    switch (dist)
    {
    case 'cdf':
      data = getCdf(data);
      yMax = 1;
      cmpchar = '\u2264'; // <=
      break;
    case 'ccdf':
      data = getSig(data);
      yMax = 1;
      cmpchar = '\u2265'; // >=
      break;
    default: // 'pdf'
      yMax = null;
      cmpchar = '=';
      break;
    }
    var yText = 'Pr(X' + cmpchar + 'x)';
    function getTooltip() {
      return 'Pr(X' + cmpchar + this.x + ') is ' + parseFloat(this.y.toFixed(5));
    }
    // Build display
    $('#diceplot').highcharts({
        title: {
          text: funcname + '(' + dice.stringform + ')' + dice.set.stringform
        },
        xAxis: {
          title: {
            text: 'x'
          }
        },
        yAxis: {
          max: yMax,
          title: {
            text: yText
          }
        },
        tooltip: {
          formatter: getTooltip
        },
        series: [{
            name: yText,
            pointStart: dice.minroll,
            data: data
        }]
    });
  }

  // Default on page load
  window.makePlot("pdf", "Sum", "2d6", "");
});
