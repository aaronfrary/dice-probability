/*
 Copyright 2013 Aaron Graham-Horowitz

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Usage:
 Output goes to <div id="diceplot"></div>.
 Draw PDF by calling makePlot(funcname, dicestring)
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

  // Return Probability Density Function over function of dice roll
  function getPdf(funcname, dice) {
    // TODO: Math...
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
      // For histogram
      column: {
        pointPadding: 0,
        borderWidth: 1,
        groupPadding: 0,
        shadow: false
      },
      series: {
        showInLegend: false
      }
    }
  });

  // Display logic
  window.makePlot = function(funcname, dicestring) {
    var dice = getDice(dicestring);
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
          title: {
            text: 'Pr(X=x)'
          }
        },
        series: [{
            pointStart: dice.minroll,
            //data: getPdf(funcname, getDice(dicestring))
            data: [.4,.4,.5,.7,1,.7,.5,.4,.4] //placeholder
        }]
    });
  }

  // Default on page load
  window.makePlot("Sum", "3d6 + d20");
});
