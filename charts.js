//week numbering -> used for cleaning data
var weekdata = [
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16, 17
    ];

//add g element for chart
var svg = d3.select(".chart"),
  margin = {top: 20, right: 80, bottom: 80, left: 100},
  width = svg.attr("width") - margin.left - margin.right,
  height = svg.attr("height") - margin.top - margin.bottom,
  g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip = d3.select(".chartDiv")
                .append("div")
                .attr("class", "toolTip");

//histogram
var histogramChart = d3.select(".histogram"),
  histogramG = histogramChart.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//set range for x, y, z
var x = d3.scaleLinear().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    z = d3.scaleOrdinal(d3.schemeCategory20)
    xHistogram = d3.scaleBand().range([0, width]).padding(0.05);

//define line function
var line = d3.line()
    .defined(function(d) {return d.total !== null;})
    .x(function(d) { return x(d.week); })
    .y(function(d) { return y(d.total); });

//loading data from csv file
d3.csv("https://raw.githubusercontent.com/jemiar/TAvisual/master/fall17data.csv", type, function(error, data) {
  if (error) throw error;
  //aggregate data
  var hrByClass = d3.nest().
    key(function(d) { return d.classID;}).
    key(function(d) { return d.week;}).
    rollup(function(v) {return {
      week: v[0].week,
      total: d3.sum(v, function(d) {return d.labtime + d.classtime + d.grading + d.officehr + d.classprep + d.other;})
      };
    }).
    entries(data);

  //use for debugging
  console.log(hrByClass);

  //clean data: missing data is set to 0 for total hour
  var hxe = hrByClass.map(function(d) { return {
    key: d.key,
    val: weekdata.map(function(w){
      if(d.values.map(function(k){return k.value;}).find(function(t){return t.week == w;}))
        return d.values.map(function(k){return k.value;}).find(function(t){return t.week == w;});
      else
        return {week: w, total: 0};
      })
    }
  });

  //use for debug
  console.log(hxe);
  console.log(hrByClass[0].values.map(function(d){return d.value;}));

  //set domain for x, y, z
  x.domain(d3.extent(data, function(d) {return d.week;}));
  y.domain([
    d3.min(hxe, function(c) {return d3.min(c.val, function(d) {return d.total; }); }),
    d3.max(hxe, function(c) {return d3.max(c.val, function(d) {return d.total; }); })
  ]);
  z.domain(hrByClass.map(function(c) {return c.key; }));
  xHistogram.domain(hxe[0].val.map(function(d) {return d.week;}));

  //append x axis
  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(17))
    .append("text")
      .attr("transform", "translate(" + (width/2) + ",30)")
      .attr("y", 8)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .attr("text-align", "right")
      .style("font-size", "30px")
      .text("Week");

  //append y axis
  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(7));

  //append text to y axis
  g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 30)
      .attr("x", 0 - (height / 2) - 50)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .style("font-size", "30px")
      .style("font-family", "sans-serif")
      .text("Working hours");

  //join data to g element
  var className = g.selectAll(".classN")
      .data(hxe)
      .enter().append("g")
      .attr("class", "classN")
      .attr("id", function(d) {return d.key.replace(/\s/g, '');})
      .style("opacity", 1);

  //used for debugging
  console.log(className);
  console.log(hrByClass.slice(18, 19)[0].values.map(function(v) {return v.value; }));

  //append line chart for each class
  className.append("path")
      .attr("class", "line")
      .attr("id", function(d) {return d.key.replace(/\s/g, '');})
      .attr("d", function(d) { return line(d.val.sort(function(a,b){return a.week - b.week;}))})
      .style("stroke", function(d) { return z(d.key); })
      .style("stroke-width", 3);

  //append circular marker
  className.append("g")
      .selectAll(".marker")
      .data(function(d) {return d.val; })
      .enter().append("circle")
      .attr("class", "marker")
      .attr("cx", line.x())
      .attr("cy", line.y())
      .attr("r", 5.0)
      .on("mouseover", function(d) {
        // console.log(d3.select("g#" + this.parentNode.parentNode.id)._groups[0][]);
        if(d3.select("g#" + this.parentNode.parentNode.id)._groups[0][0].style.opacity == 1)
          tooltip.style("left", d3.mouse(this)[0] + 90 + "px")
                .style("top", d3.mouse(this)[1] + 60 + "px")
                .style("display", "inline-block")
                .html(this.parentNode.parentNode.id + "<br>" + "Week " + d.week + " : " + d.total + "hrs");
        else
          tooltip.style("display", "none");
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });

  //style each circle to its corresponding color
  className.selectAll("g")
      .style("stroke", function(d) { return z(d.key); })
      .style("stroke-width", 2.5)
      .style("fill", function(d) { return z(d.key); });

  //used for debugging
  console.log(className.selectAll("g").data());
  console.log(line.y());

  //append graphic element to the legend part on the right
  var legen = d3.select(".legend")
      .append("g")
      .selectAll(".classNLegend")
      .data(hxe)
      .enter().append("g")
      .attr("class", "classNLegend");

  //append legend rect
  var legenRect = legen
      .append("rect")
      .attr("class", "legendRec")
      .attr("id", function(d) { return "Rec" + d.key.replace(/\s/g, ''); })
      //position rect
      .attr("x", function(d, i) {
        if(i%2 == 0)
          return 0;
        else
          return 75;
      })
      .attr("y", function(d, i){
        if(i%2 == 0)
          return i/2*35;
        else
          return (i-1)/2*35;
      })
      .attr("width", 70)
      .attr("height", 30)
      .attr("fill", function(d) {return z(d.key); })
      //when click on rect, show or hide line chart
      .on("click", function(d, i) {
        console.log(d3.select("g#" + d.key.replace(/\s/g, '')));
        console.log(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0]);
        d3.select("g#" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("opacity", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0)
              return 1;
            else
              return 0; });

        d3.select("#Rec" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("fill", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0)
              return z(d.key);
            else
              return "#d9d9d9";
          });

        d3.select("#Txt" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("stroke", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0){
              if(i%2 == 0)
                return "#fff";
              else
                return "#000";
            } else
                return "#fff";
          });
      });

  //append legend text
  var legendText = legen
      .append("text")
      .text(function(d) {return d.key})
      .attr("class", "legendTxt")
      .attr("id", function(d) { return "Txt" + d.key.replace(/\s/g, ''); })
      //align text to be in the middle of its corresponding rect
      .attr("x", function(d, i) {
        if(i%2 == 0)
          return 10;
        else
          return  85;
      })
      .attr("y", function(d, i) {
        if(i%2 == 0)
          return i/2*35 + 10;
        else
          return (i-1)/2*35 + 10;
      })
      .attr("dy", "0.6em")
      .style("font", "lighter 15px sans-serif")
      .style("stroke", function(d, i) {
        if(i%2 == 0)
          return "#fff";
        else
          return "#000";
      })
      //when click on text, show or hide corresponding line chart
      .on("click", function(d, i) {
        console.log(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0]);
        d3.select("g#" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("opacity", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0)
              return 1;
            else
              return 0;});

        d3.select("#Rec" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("fill", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0)
              return z(d.key);
            else
              return "#d9d9d9";
          });

        d3.select("#Txt" + d.key.replace(/\s/g, ''))
          .transition().duration(100)
          .style("stroke", function() {
            if(d3.select("g#" + d.key.replace(/\s/g, ''))._groups[0][0].style.opacity == 0){
              if(i%2 == 0)
                return "#fff";
              else
                return "#000";
            } else
                return "#fff";
        });
      });

  //add clear button: when clicked, all lines' opacity is 0
  var btn = d3.select(".clearButton")
    .append("button")
    .text("Clear")
    .on("click", function() {
      d3.selectAll(".classN")
      .transition().duration(100)
      .style("opacity", 0);

      d3.selectAll(".legendRec")
      .transition().duration(100)
      .style("fill", "#d9d9d9");

      d3.selectAll(".legendTxt")
      .transition().duration(100)
      .style("stroke", "#fff");
      console.log(d3.select(".line"));
    });

  //used for append text at the end of a line chart
  // className.append("text")
  //     .datum(function(d) { return {id: d.key, value: d.val[d.val.length - 1]}; })
  //     .attr("transform", function(d) { return "translate(" + x(d.value.week) + "," + y(d.value.total) + ")"; })
  //     .attr("id", function(d
  //     .style("font", "10px sans-serif")
  //     .text(function(d) { return d.id; });
  //--------------------------------------------------------------------
  //--------------------------------------------------------------------
  //----------------------------SECOND CHART----------------------------
  //--------------------------------------------------------------------
  //--------------------------------------------------------------------

  //append x axis
  histogramG.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xHistogram).ticks(17))
    .append("text")
      .attr("transform", "translate(" + (width/2) + ",30)")
      .attr("y", 8)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .attr("text-align", "right")
      .style("font-size", "30px")
      .text("Week");

  y.domain([
          d3.min(hxe[0].val, function(d) {return d.total; }),
          d3.max(hxe[0].val, function(d) {return d.total; })
        ]);

  //append y axis
  histogramG.append("g")
      .attr("class", "axis axis--y")
      .attr("id", "histogramYAxis")
      .call(d3.axisLeft(y));

  //append text to y axis
  histogramG.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 30)
      .attr("x", 0 - (height / 2) - 50)
      .attr("dy", "0.71em")
      .attr("fill", "#000")
      .style("font-size", "30px")
      .style("font-family", "sans-serif")
      .text("Working hours");

  var barChart = histogramG.selectAll(".bar")
      .data(hxe[0].val)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) {return xHistogram(d.week);})
      .attr("width", xHistogram.bandwidth())
      .attr("y", function(d) {return y(d.total);})
      .attr("height", function(d) {return height - y(d.total);});

  //append graphic element to the legend part on the right
  var legendHis = d3.select(".legendHistogram")
      .append("g")
      .selectAll(".classHistogram")
      .data(hxe)
      .enter().append("g")
      .attr("class", "classHistogram");

  //append legend rect
  var histogramRect = legendHis
      .append("rect")
      .attr("class", "histogramRec")
      .attr("id", function(d) { return "histogramRec" + d.key.replace(/\s/g, ''); })
      //position rect
      .attr("x", function(d, i) {
        if(i%2 == 0)
          return 0;
        else
          return 75;
      })
      .attr("y", function(d, i){
        if(i%2 == 0)
          return i/2*35;
        else
          return (i-1)/2*35;
      })
      .attr("width", 70)
      .attr("height", 30)
      .attr("fill", "#d9d9d9")
      //when click on rect, show or hide line chart
      .on("click", function(d, i) {
        histogramRect.style("fill", "#d9d9d9");
        histogramText.style("stroke", "#000");
        d3.select(this).style("fill", "steelblue");
        histogramText._groups[0][i].style.stroke = "#fff";
        console.log(barChart);

        y.domain([
          d3.min(hxe[i].val, function(d) {return d.total; }),
          d3.max(hxe[i].val, function(d) {return d.total; })
        ]);

        d3.select("#histogramYAxis")
          .transition().duration(500)
          .call(d3.axisLeft(y));

        barChart.data(hxe[i].val).transition().duration(500)
          .attr("x", function(d) {return xHistogram(d.week);})
          .attr("width", xHistogram.bandwidth())
          .attr("y", function(d) {return y(d.total);})
          .attr("height", function(d) {return height - y(d.total);});
      });

  //append legend text
  var histogramText = legendHis
       .append("text")
       .text(function(d) {return d.key})
       .attr("class", "histogramTxt")
       .attr("id", function(d) { return "Txt" + d.key.replace(/\s/g, ''); })
  //     //align text to be in the middle of its corresponding rect
       .attr("x", function(d, i) {
        if(i%2 == 0)
          return 10;
        else
          return  85;
      })
      .attr("y", function(d, i) {
        if(i%2 == 0)
          return i/2*35 + 10;
        else
          return (i-1)/2*35 + 10;
      })
      .attr("dy", "0.6em")
      .style("font", "lighter 15px sans-serif")
      .style("stroke", "#000")
      .on("click", function(d, i) {
        histogramRect.style("fill", "#d9d9d9");
        histogramText.style("stroke", "#000");
        d3.select(this).style("stroke", "#fff");
        histogramRect._groups[0][i].style.fill = "steelblue";

        y.domain([
          d3.min(hxe[i].val, function(d) {return d.total; }),
          d3.max(hxe[i].val, function(d) {return d.total; })
        ]);

        d3.select("#histogramYAxis")
          .transition().duration(500)
          .call(d3.axisLeft(y));

        barChart.data(hxe[i].val).transition().duration(500)
          .attr("x", function(d) {return xHistogram(d.week);})
          .attr("width", xHistogram.bandwidth())
          .attr("y", function(d) {return y(d.total);})
          .attr("height", function(d) {return height - y(d.total);});
      });
  
  d3.select(".histogramRec").style("fill", "steelblue");
  d3.select(".histogramTxt").style("stroke", "#fff");

});

//make sure to change from string to number
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