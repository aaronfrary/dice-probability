/*
 Copyright 2013 Aaron Graham-Horowitz

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Usage:
 Output goes to <div id="diceplot"></div>.
 Draw PMF by calling makePlot(dist, funcname, dicestring)
 where dist is 'PDF', 'CDF', or 'SIG', funcname is 'Sum', 'Min', or 'Max',
 and dicestring denotes the dice to roll e.g. '3d6, 1d20'.
*/
$(function() {
  "use strict"

  // Parse string to get the dice we want to roll
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

  // Return PMF of Unif(1,n)
  function unif(n) {
    var pmf = []
    for (var i=0; i < n; i++)
      pmf.push(1/n);
    return pmf;
  }

  // Return convolution of oldpmf with a new die roll
  // NOTE: This is a highly specialized convolution function
  // not useful outside this context
  // TODO: Abstract out commonalities with convomax, convomin
  function convolute(oldpmf, sides) {
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

  function convomin(oldpmf, sides) {
    var oldsig = getSig(oldpmf);
    var pmf = [];
    var support = Math.min(oldpmf.length, sides);
    var p = 0;
    for (var z=0; z < support; z++)
      pmf.push((oldpmf[z] * (sides - z - 1) + oldsig[z]) / sides);
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

  // Return P(X >= x) for X~pmf
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

  var funcmap = {
    sum : convolute,
    max : convomax,
    min : convomin
  }

  // Return Probability Mass Function over function of dice roll
  function getPmf(funcname, dice) {
    var sides;
    var pmf = [];
    for (var d=0; d < dice.length; d++) // die type
    {
      sides = dice[d][1];
      for (var r=0; r < dice[d][0]; r++) // times to roll
      {
        if (pmf.length === 0)   // base case
          pmf = unif(sides);
        else
          pmf = funcmap[funcname](pmf, sides);
      }
    }
    return pmf;
  }

  // Make it pretty
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
    }
  });

  // Display logic
  window.makePlot = function(dist, funcname, dicestring) {
    // Process input
    if (dicestring.length === 0)
      return;
    var dice = getDice(dicestring);
    var data = getPmf(funcname.toLowerCase(), dice);
    var yMax, cmpchar;
    if (funcname.toLowerCase() !== 'sum')
      dice.minroll = 1;
    dist = dist.toLowerCase();
    switch (dist) {
    case 'cdf':
      data = getCdf(data);
      yMax = 1;
      cmpchar = '\u2264'; // <=
      break;
    case 'sig':
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
          text: funcname + '(' + dice.stringform + ')'
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
  window.makePlot("pdf", "Sum", "2d6");
});
