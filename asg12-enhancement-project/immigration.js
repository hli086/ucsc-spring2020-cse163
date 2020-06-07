/*eslint-env es6*/
/*eslint-env browser*/
/*eslint no-console: 0*/
/*global d3 */

// Stacked area chart code from d3-graph-gallery.com
// Modified by Herbert Li

// set the dimensions and margins of the graph
var margin = {top: 50, bottom: 50, left: 80, right: 180},
    width = 860 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

// append the svg for area chart to the body of the page
var svg = d3.select("#stacked_area_chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// append the svg for area chart slider to the body of the page
const height_slider = 50;
var svg_slider = d3.select("#stacked_area_chart_slider")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height_slider)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${height_slider/2})`);

// appened the svg for the pie chart to the body of the page
var svg_pie_chart = d3.select("#pie_chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width/2+margin.left}, ${height/2+margin.top})`);
var radius = Math.min(width, height) / 2;

// create a black bar behind the char for the date slider
svg.append('line')
    .attr("class", "slide")
    .attr("stroke", "black")
    .attr("stroke-width", 1);

// data format
const parseTime = d3.timeParse("%Y");

console.log(parseTime(1970));

// Parse the Data
d3.csv("immigration.csv").then(function(data) {
    
    console.log(data);
    
    /////////////
    // GENERAL //
    /////////////

    // format the data
    data.forEach(function(d) {
        d.year = parseTime(d.year);
    });
  
    // List of groups = header of the csv files
    var keys = data.columns.slice(1);
    
    console.log(keys);

    // color palette
    var color = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeCategory10);

    // stack the data?
    var stackedData = d3.stack()
        .keys(keys)(data);
    
    console.log(stackedData);
    
    
    /////////////////
    // DEFINE AXIS //
    /////////////////
    
    // Define X axis
    var x = d3
        .scaleTime()
        .domain(d3.extent(data, d => d.year))
        .range([0, width])
        .clamp(true);
    
    // Define Y axis
    var y = d3.scaleLinear()
        .domain([0, 40]) // 0% to 40%
        .range([height, 0]);
    
    
    
    /////////////////////////////
    // BRUSHING AND AREA CHART //
    /////////////////////////////

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", 0)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);
    
    // Area chart starting animation
    d3.select("#clip rect")
        .transition().duration(3000)
        .attr("width", width);

    // Add brushing
    var brush = d3.brushX() // Add the brush feature using the d3.brush function
        .extent( [ [0,0], [width,height] ] ) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
        .on("end", updateChart) // Each time the brush selection changes, trigger the 'updateChart' function

    // Create the scatter variable: where both the circles and the brush take place
    var areaChart = svg.append('g')
        .attr("clip-path", "url(#clip)")

    // Area chart generator
    var area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    // Show the area chart
    areaChart
        .selectAll("mylayers")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", d => `myArea ${d.key}`)
        .style("fill", function(d) { return color(d.key); })
        .attr("d", area);

    // Add the brushing
    areaChart
        .append("g")
        .attr("class", "brush")
        .call(brush);

    var idleTimeout;
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart() {
        let extent = d3.event.selection;
        
        // If no selection, back to initial coordinate. Otherwise, update X axis domain
        if (!extent) {
            // This allows to wait a little bit
            if (!idleTimeout) return idleTimeout = setTimeout(idled, 350);
            x.domain(d3.extent(data, d => d.year))
        } else {
            x.domain([x.invert(extent[0]), x.invert(extent[1])]);
            // This remove the grey brush area as soon as the selection has been done
            areaChart.select(".brush").call(brush.move, null);
        }

        // Update axis and area chart position
        xAxis.transition().duration(1000).call(xAxisDrawFunc);
        areaChart
          .selectAll("path")
          .transition().duration(1000)
          .attr("d", area);

    }

    
    
    ///////////////
    // DRAW AXIS //
    ///////////////

    // Add X axis
    var xAxisDrawFunc = d3
        .axisBottom(x)
        .ticks(d3.timeYear.every(20))
        ;
    var xAxis = svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxisDrawFunc)
        ;

    // Add X axis label:
    svg.append("text")
        .attr("x", width + 110)
        .attr("y", height + 20)
        .attr("text-anchor", "end")
        .text("Time (year)");

    // Add Y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));

    // Add Y axis label:
    svg.append("text")
        .attr("x", 0)
        .attr("y", -20)
        .attr("text-anchor", "start")
        .text("Percentage of Immigrants");
    
    

    ////////////////////////////////
    // AREA CHART HIGHLIGHT GROUP //
    ////////////////////////////////

    // What to do when one group is hovered
    let highlight = function(d) {
        console.log(d);
        // reduce opacity of all groups
        d3.selectAll(".myArea").style("opacity", .1);
        d3.selectAll(".myPie").style("opacity", .1);
        // expect the one that is hovered
        d3.selectAll(`.${d}`).style("opacity", 1);
    }

    // And when it is not hovered anymore
    let noHighlight = function(d) {
        d3.selectAll(".myArea").style("opacity", 1);
        d3.selectAll(".myPie").style("opacity", 1);
    }



    ////////////
    // LEGEND //
    ////////////

    // Add one dot in the legend for each name.
    var size = 20;
    svg.selectAll("myrect")
        .data(keys)
        .enter()
        .append("rect")
        .attr("x", width+20)
        .attr("y", function(d,i){ return 50 + i*(size+15)}) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("width", size)
        .attr("height", size)
        .style("fill", function(d){ return color(d)})
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight)
        ;

    // Add one dot in the legend for each name.
    svg.selectAll("mylabels")
        .data(keys)
        .enter()
        .append("text")
        .attr("x", width+20 + size*1.2)
        .attr("y", function(d,i){ return 50 + i*(size+15) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function(d){ return color(d)})
        .text(d => d.replace("_", " ")) // replace underscore with space in label
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight)
        ;



    /////////////////
    // DATE SLIDER //
    /////////////////
    
    // Add the slider into the svg
    var slider = svg_slider.append("g")
        .attr("class", "slider")
        ;

    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", function() {
                
                //console.log(x.invert(d3.event.x));
                
                time(x.invert(d3.event.x));
            }));
    
    // slider ticks
    //slider.insert("g", ".track-overlay")
        //.attr("class", "ticks")
        //.attr("transform", `translate(${0}, ${0})`)
        //.selectAll("text")
        //.data(x.ticks(10))
        //.enter().append("text")
        //.attr("x", x)
        //.attr("text-anchor", "middle")
        //.text(function(d) { return d3.timeFormat("%Y")(d); })
        //;

    var handle = slider.insert("circle", ".track-overlay")
        .attr("class", "slider-handle")
        .attr("r", 9);
    
    
    //slider.transition() // Gratuitous intro!
    //    .duration(750)
    //    .tween("time", function() {
    //        var i = d3.interpolate(new Date("1850"), new Date("1970"));
    //        return function(t) { time(i(t)); };
    //    });
    
    
    
    function time(h) {
        // move the black bar on the area chart with the slider handle
        d3.select('.slide')
            .attr("x1", x(h))
            .attr("x2", x(h))
            .attr("y1", 0)
            .attr("y2", height);
        
        // move the slider handle
        handle.attr("cx", x(h));
        //console.log((h.getUTCFullYear()));
        
        //console.log(h.getUTCFullYear()<=1970);
        
        //console.log(new Date("1855").getUTCFullYear());
        
        let pie_chart_info = [12, 1970, 1970]; // index, data year, slider year
        
        // determine which pie chart to draw
        if (h.getUTCFullYear() <= 1855) {
            //console.log("before 1855");
            pie_chart_info[0] = 0;
            pie_chart_info[1] = 1850;
        } else
        if (h.getUTCFullYear() <= 1865) {
            //console.log("before 1865");
            pie_chart_info[0] = 1;
            pie_chart_info[1] = 1860;
        } else
        if (h.getUTCFullYear() <= 1875) {
            //console.log("before 1875");
            pie_chart_info[0] = 2;
            pie_chart_info[1] = 1870;
        } else
        if (h.getUTCFullYear() <= 1885) {
            //console.log("before 1885");
            pie_chart_info[0] = 3;
            pie_chart_info[1] = 1880;
        } else
        if (h.getUTCFullYear() <= 1895) {
            //console.log("before 1895");
            pie_chart_info[0] = 4;
            pie_chart_info[1] = 1890;
        } else
        if (h.getUTCFullYear() <= 1905) {
            pie_chart_info[0] = 5;
            pie_chart_info[1] = 1900;
            
        } else
        if (h.getUTCFullYear() <= 1915) {
            pie_chart_info[0] = 6;
            pie_chart_info[1] = 1910;
            
        } else
        if (h.getUTCFullYear() <= 1925) {
            pie_chart_info[0] = 7;
            pie_chart_info[1] = 1920;
            
        } else
        if (h.getUTCFullYear() <= 1935) {
            pie_chart_info[0] = 8;
            pie_chart_info[1] = 1930;
            
        } else
        if (h.getUTCFullYear() <= 1945) {
            pie_chart_info[0] = 9;
            pie_chart_info[1] = 1940;
            
        } else
        if (h.getUTCFullYear() <= 1955) {
            pie_chart_info[0] = 10;
            pie_chart_info[1] = 1950;
            
        } else
        if (h.getUTCFullYear() <= 1965) {
            pie_chart_info[0] = 11;
            pie_chart_info[1] = 1960;
            
        } else
        if (h.getUTCFullYear() <= 1975) {
            pie_chart_info[0] = 12;
            pie_chart_info[1] = 1970;
            
        } else
        if (h.getUTCFullYear() <= 1985) {
            pie_chart_info[0] = 13;
            pie_chart_info[1] = 1980;
            
        } else
        if (h.getUTCFullYear() <= 1995) {
            pie_chart_info[0] = 14;
            pie_chart_info[1] = 1990;
            
        } else
        if (h.getUTCFullYear() <= 2005) {
            pie_chart_info[0] = 15;
            pie_chart_info[1] = 2000;
            
        } else
        if (h.getUTCFullYear() <= 2015) {
            pie_chart_info[0] = 16;
            pie_chart_info[1] = 2010;
            
        }
        
        pie_chart_info[2] = h.getUTCFullYear();
        
        //console.log((pie_chart_info));
        
        draw_pie_chart(data[pie_chart_info[0]], pie_chart_info);
            
    }
    
    // default slider handle and black bar position is at 1970
    time(new Date("1970")); 
    
    
    
    ///////////////
    // PIE CHART //
    ///////////////
    
    //var data1 = [{"letter":"q","presses":1},{"letter":"w","presses":5},{"letter":"e","presses":2}];
    //console.log(data1);
    
    //console.log(data[0]);
    
    function draw_pie_chart(data, pie_chart_info) {
        
        // remove existing pie chart
        svg_pie_chart.selectAll("*")
            .remove();
        
        var pie_data = [];

        // Parse row
        for (let [key, value] of Object.entries(data)) {
            
            //console.log(`${key}: ${value}`);
            
            if (key != "year"){
                pie_data.push({key, value});
            }
            
        }

        //console.log(pie_data);
        
        ///////////////////////////////
        // PIE CHART HIGHLIGHT GROUP //
        ///////////////////////////////

        // What to do when one group is hovered
        let highlightPie = function(d) {
            console.log(d.data.key);
            // reduce opacity of all groups
            d3.selectAll(".myArea").style("opacity", .1);
            d3.selectAll(".myPie").style("opacity", .1);
            // expect the one that is hovered
            d3.selectAll(`.${d.data.key}`).style("opacity", 1);
        }

        // And when it is not hovered anymore
        let noHighlightPie = function(d) {
            d3.selectAll(".myArea").style("opacity", 1);
            d3.selectAll(".myPie").style("opacity", 1);
        }
        


        ////////////////////
        // DRAW PIE CHART //
        ////////////////////

        // Pie generator
        var pie = d3.pie()
            .value(function(d) {
                return d.value;
            })
            (pie_data);
        
        // Arc generator
        var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

        var labelArc = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

        var g_pie = svg_pie_chart.selectAll("arc")
        .data(pie)
        .enter().append("g")
        .attr("class", "arc");

        g_pie.append("path")
        .attr("class", d => `myPie ${d.data.key}`)
        .attr("d", arc)
        .style("fill", d => color(d.data.key))
        .on("mouseover", highlightPie)
        .on("mouseleave", noHighlightPie)
        ;
        
        
        let dataYear = pie_chart_info[1]; // year in decades
        let currYear = pie_chart_info[2]; // year by year
        
        //Pie Chart Title with changing year
        svg_pie_chart.append("text")
            .attr("id", "pie-chart-title")
            .attr("x", 0)             
            .attr("y", -radius)
            .attr("text-anchor", "middle")
            .text(`${dataYear} Immigration Background`); // pie chart description
        
        // Historial note
        let pie_chart_hstnote = svg_pie_chart.append("text")
            .attr("id", "pie-chart-hstnote")
            .attr("class", "hstnote")
            .attr("x", 0)             
            .attr("y", radius+10)
            .attr("text-anchor", "middle");
        
        
        
        // Check each event and show history note
        if (currYear >= 1840 && currYear < 1860) {
            d3.select('.hstnote')
                .text('1840-1860: Irish potato famine, many flee Ireland');
        }
        if (dataYear == 1860) {
            d3.select('.hstnote')
                .text('1859: California passes law that bans all immigration from China');
        }
        if (dataYear == 1880) {
            d3.select('.hstnote')
                .text('1882: Chinese Exclusion Act bans all immigration from China into California');
        }
        if (dataYear == 1910) {
            d3.select('.hstnote')
                .text('1910-1917: Mexican revolution causes refugees to flee to the US');
        }
        if (dataYear == 1930) {
            d3.select('.hstnote')
                .text('1930: The Great Depression causes downturn in immigration');
        }
        if (dataYear == 1940) {
            d3.select('.hstnote')
                .text('1943: US and China ally against Japan during WWII, Chinese Exclusion Act repealed');
        }
        if (dataYear == 1960) {
            d3.select('.hstnote')
                .text('1965: Immigration Nationality Act allows visas based on skill and family');
        }
        if (currYear >= 1970 && currYear <= 1973) {
            d3.select('.hstnote')
                .text('1970-1973: US sponsored coup in Chile');
        }
        if (currYear >= 1975 && currYear <= 1977) {
            d3.select('.hstnote')
                .html(`<tspan x="0" text-anchor="middle">1976: US sponsored coup in Argentina</tspan><tspan x="0" text-anchor="middle" dy = "20">1976: First Mexican peso crisis</tspan>`);
        }
        if (currYear >= 1978 && currYear <= 1979) {
            d3.select('.hstnote')
                .text('1978-1979: Iranian revolution sparks mass exodus');
        }
        if (currYear >= 1981 && currYear <= 1990) {
            d3.select('.hstnote')
                .text('1981-1990: US sponsored coup in Nicaragua (Iran-Contra)');
        }
        if (currYear >= 1991 && currYear <= 1998) {
            d3.select('.hstnote')
                .text('1994: NAFTA passes, Mexican goods production declines');
        }
         
    }

});
