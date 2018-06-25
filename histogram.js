//Array used for week numbering
var weekNo = [
	1, 2, 3, 4,
	5, 6, 7, 8,
	9, 10, 11, 12,
	13, 14, 15, 16, 17
];

//Select the chart svg
//Define margin
//Calculate width and height of the drawing area
//Apprend graphic element "g" inside the svg
var chart = d3.select(".chart"),
	margin = {top: 20, right: 80, bottom: 80, left: 100},
	width = chart.attr("width") - margin.left - margin.right,
	height = chart.attr("height") - margin.top - margin.bottom,
	g = chart.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//Set ranges for x and y axes, and z (color)
var x = d3.scaleBand().range([0, width]).padding(0.1),
	y = d3.scaleLinear().range([height, 0]);
	z = d3.scaleOrdinal(["steelblue", "#dd1c77"]);

//Set domain for x axis, and z(color)
x.domain(weekNo);
z.domain(["Fall17", "Spring18"]);

//Read data from 2 files, then use await() when finish reading and call assignData function
//callback function type() used for convert string to number
d3.queue()
	.defer(d3.csv, "https://raw.githubusercontent.com/jemiar/TAvisual/master/fall17data.csv", type)
	.defer(d3.csv, "https://raw.githubusercontent.com/jemiar/TAvisual/master/spring18data.csv", type)
	.await(processData);

//type function: convert string to number
function type(d) {
  	d.labtime = +d.labtime;
  	d.classtime = +d.classtime;
  	d.grading = +d.grading;
  	d.officehr = +d.officehr;
  	d.classprep = +d.classprep;
  	d.other = +d.other;
  	d.week = +d.week;
  	return d;
}

//called after reading data from 2 csv files finishes
function processData(error, dataFall17, dataSpring18) {
	if(error) throw error;

	//function used to group data by class, semester, week respectively
	function groupData(data) {
		return d3.nest()
					.key(function(d) { return d.classID; })
					.key(function(d) { return d.semester; })
					.key(function(d) { return d.week; })
					.rollup(function(v) { return {
						week: v[0].week,
						total: d3.sum(v, function(d) { return d.labtime + d.classtime + d.grading + d.officehr + d.classprep + d.other; })
						};
					})
					.entries(data);
	}

	//group Fall17 data by class, then semester and week
	var dataFall17_groupedByClass = groupData(dataFall17);
	console.log(dataFall17_groupedByClass);

	//group Spring18 data by class, then semester and week
	var dataSpring18_groupedByClass = groupData(dataSpring18);
	console.log(dataSpring18_groupedByClass);

	//function used to pad zero to missing week
	function padZero(data) {
		return data.map(function(d) {
			return {
				key: d.key,
				values: [{
					key: d.values[0].key,
					values: weekNo.map(function(w) {
						if(d.values[0].values.find(function(e) { return e.value.week == w; }))
							return d.values[0].values.find(function(e) { return e.value.week == w; }).value;
						else
							return {week: w, total: 0};
					})
				}]
			}
		});
	}

	//padding zero to fall17 data
	var dataFall17_paddedZero = padZero(dataFall17_groupedByClass);
	console.log(dataFall17_paddedZero);

	//padding zero to spring18 data
	var dataSpring18_paddedZero = padZero(dataSpring18_groupedByClass);
	console.log(dataSpring18_paddedZero);

	//merge 2 data: fall17 and spring18
	var data_Merged = d3.merge([dataFall17_paddedZero, dataSpring18_paddedZero]);
	console.log(data_Merged);

	//group data by class
	var data_Combined = d3.nest()
							.key(function(d) { return d.key; })
							.rollup(function(v) {
								return v.map(function(e) { return e.values; })
										//flatten array
										.reduce((accumulator, current) => accumulator.concat(current), []);
							})
							.entries(data_Merged);
			
	console.log(data_Combined);

	//Variables to store histogram data of Fall17 and Spring18
	var fall17Histogram, spring18Histogram;

	//Variable to store value to check if 1 class has 2 sessions, or just 1 session
	//1: 2sessions, 2: only fall, 3: only spring
	var typeOfClass;

	//Function to set fall17 and spring18 histogram data depending on selected class or coarse level
	function updateData(i, coarseLevel) {
		//Variable to store the upper limit of working hour
		var upperLimit;
		//Set upper limit, depending on if the class has both fall and spring sessions or just one
		if(data_Combined[i].value.length > 1)
			upperLimit = d3.max([
				(d3.max(data_Combined[i].value[0].values.map(e => e.total)) / 10 + 1) * 10,
				(d3.max(data_Combined[i].value[1].values.map(e => e.total)) / 10 + 1) * 10
				]);
		else
			upperLimit = (d3.max(data_Combined[i].value[0].values.map(e => e.total)) / 10 + 1) * 10;

		//Variable to store linear scale used for histogram generation
		var xScale = d3.scaleLinear()
						.domain([0, upperLimit])
						.range([0, width]);

		//Function to generate histogram
		function generateHistogram(data) {
			var histogram = d3.histogram()
								.domain(xScale.domain())
								.thresholds(xScale.ticks(upperLimit / coarseLevel))
								(data.filter(e => e.total != 0).map(el => el.total));

			histogram.pop();

			return histogram.map(function(d) {
				return {
					key: "[" + d.x0 + ", " + d.x1 + "]",
					frequency: d.length
				}
			});
		}

		if(data_Combined[i].value.length > 1) {
			fall17Histogram = generateHistogram(data_Combined[i].value[0].values);
			spring18Histogram = generateHistogram(data_Combined[i].value[1].values);
			typeOfClass = 1;
		} else {
			if(data_Combined[i].value[0].key == 'Fall17') {
				fall17Histogram = generateHistogram(data_Combined[i].value[0].values);
				typeOfClass = 2;
			} else {
				spring18Histogram = generateHistogram(data_Combined[i].value[1].values);
				typeOfClass = 3;
			}
		}
	}

	//Setup for 1st class
	updateData(0, 10);

	//Function to set domain for x and y axes
	function setDomain() {
		//Set x domain
		if(typeOfClass > 2)
			x.domain(spring18Histogram.map(e => e.key));
		else
			x.domain(fall17Histogram.map(e => e.key));

		//Set y domain
		switch(typeOfClass) {
			case 1:
				y.domain([
					0,
					d3.max([
						d3.max(fall17Histogram.map(e => e.frequency)),
						d3.max(spring18Histogram.map(e => e.frequency))
						])
					]);
				break;
			case 2:
				y.domain([
					0,
					d3.max(fall17Histogram.map(e => e.frequency))
					]);
				break;
			case 3:
				y.domain([
					0,
					d3.max(spring18Histogram.map(e => e.frequency))
					]);
				break;
			default:
				console.log('Error');
		}
	}

	//Call setDomain() to set x, y domain
	setDomain();

	//Draw x axis
	g.append("g")
		.attr("id", "axisX")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x))
	.append("text")
		.attr("transform", "translate(" + (width/2) + ",30)")
		.attr("y", 8)
		.attr("dy", "0.71em")
		.attr("fill", "#000")
		.attr("text-align", "right")
		.style("font-size", "30px")
		.text("Working hours");

	//Draw y axis
	g.append("g")
		.attr("id", "axisY")
		.call(d3.axisLeft(y))
	.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 0 - margin.left + 20)
		.attr("x", 0 - (height / 2) + 90)
		.attr("dy", "0.71em")
		.attr("fill", "#000")
		.style("font-size", "30px")
		.style("font-family", "sans-serif")
		.text("Frequency");

	//function to draw bar charts
	function draw_Bar_Chart(selection) {
		//Draw bar charts
		selection.selectAll('.bar')
					.data(function(d) { return d.values; })
					.enter().append('rect')
						.attr('class', 'bar')
						.attr('x', function(d) {
							//Below is how you get the parentNode, as well as its data
							if(d3.select(this.parentNode).datum().key == 'Fall17')
								return x(d.week);
							else
								return x(d.week) + x.bandwidth() / 2;
						})
						.attr('width', x.bandwidth() / 2)
						.attr('y', function(d) { return y(d.total); })
						.attr('height', function(d) { return height - y(d.total); })
						.style('fill', function(d) { return z(d3.select(this.parentNode).datum().key); })
						.attr('data-toggle', 'tooltip')
						.attr('data-placement', 'top')
						.attr('title', function(d) { return 'Week ' + d.week + ': ' + d.total + ' hrs'; });

		//Add tooltip to bar charts
		$('.bar').tooltip({ 'container': 'body'});
	}

	//Join data to g element
	var barChart = g.selectAll(".barGraphic")
						.data(data_Combined[0].value)
						.enter()
					.append("g")
						.attr("class", "barGraphic");

	//Draw line charts and markers
	draw_Bar_Chart(barChart);

	//Append buttons to legend
	var legend = d3.select(".legend")
						.selectAll(".courseButton")
						.data(data_Combined)
						.enter()
						.append("button")
							.attr("class", "courseButton btn-sm")
						.append("text")
							.text(function(d) { return d.key; });

	//Color the 1st button
	$(".courseButton").first().css('background', 'blue').children().css('color', 'white');

	//Set event listener to course button
	d3.selectAll('.courseButton')
		.on('click', function(d, i) {
			//Set style for all buttons back to white background and black text
			d3.selectAll('.courseButton').style('background', 'white')
				.selectAll('text').style('color', 'black');
			//variable to store the ith element
			var nth_btn = '.courseButton:nth-child(' + (i + 1) + ')';
			//Set style of the clicked button to blue background and white text
			d3.select(nth_btn).style('background', 'blue')
				.select('text').style('color', 'white');
			//Set domain of y axis
			setYDomain(data_Combined[i]);
			//Animate change in y axis
			d3.select('#axisY')
				.transition().duration(500)
				.call(d3.axisLeft(y));

			//Update bar chart data
			//NOTE: Need to use a parent selector. In this case 'g'
			//Do not use d3.selectAll
			//In order to use append below
			var barChartUpdate = g.selectAll('.barGraphic')
										.data(data_Combined[i].value);

			//Remove old data
			barChartUpdate.exit().remove();

			//Append and merge new data
			barChartUpdate.enter()
						.append('g')
							.attr('class', 'barGraphic')
						.merge(barChartUpdate);

			//Remove old bar charts
			d3.selectAll('.barGraphic').selectAll('rect').remove();

			//Select .barGraphic elements
			var barGraphicUpdate = d3.selectAll('.barGraphic');

			//Redraw bar charts
			draw_Bar_Chart(barGraphicUpdate);
		});
}