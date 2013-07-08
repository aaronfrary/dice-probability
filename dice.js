/*
 Copyright 2013 Aaron Graham-Horowitz

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Usage:
 Output goes to <div id="diceplot"></div>.
 Draw PMF by calling makePlot(funcname, dicestring)
 where funcname is 'Sum', 'Min', or 'Max'
 and dicestring denotes the dice to roll e.g. '3d6, 1d20'.
*/
$(function() {
  "use strict"

  // Parse string to get the dice we want to roll
  function getDice(s) {
    var pattern=/\d*d\d+/ig;
    var dice = [];
    dice.minroll = 0;
    dice.maxroll = 0;
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
      dice.maxroll += die[0] * die[1];
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
  function convolute(oldpmf, sides, support) {
    var pmf = [];
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

  var funcmap = {
    sum : convolute
  }

  // Return Probability Mass Function over function of dice roll
  function getPmf(funcname, dice) {
    var sides;
    var pmf = [];
    var minroll = 0;
    var maxroll = 0;
    var support = 1;
    for (var d=0; d < dice.length; d++) // die type
    {
      sides = dice[d][1];
      for (var r=0; r < dice[d][0]; r++) // times to roll
      {
        minroll += 1;
        maxroll += sides;
        support += sides - 1;
        if (pmf.length === 0)   // base case
          pmf = unif(sides);
        else
          pmf = funcmap[funcname](pmf, sides, support);
      }
    }
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
  window.makePlot = function(funcname, dicestring, needCdf) {
    if (dicestring.length === 0)
      return;
    var dice = getDice(dicestring);
    var data = getPmf(funcname.toLowerCase(), dice);
    var yText = 'Pr(X=x)';
    var yMax = null;
    if (needCdf) {
      data = getCdf(data);
      yText = 'Pr(X\u2264x)'; // Pr(X <= x)
      yMax = 1;
    }
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
            text: yText,
          }
        },
        series: [{
            name: yText,
            pointStart: dice.minroll,
            data: data
        }]
    });
  }

  // Default on page load
  window.makePlot("Sum", "2d6", false);
});
