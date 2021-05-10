import data from './data.js'
import barchart from './barchart.js'



barchart.init('chart-anchor', 500, 300);
barchart.render(data, 'Kilometers Run', 'Day of the Week');