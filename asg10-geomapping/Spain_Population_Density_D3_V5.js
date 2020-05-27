/*eslint-env es6*/
/*eslint-env browser*/
/*eslint no-console: 0*/
/*global d3 */

// Define Margin
var margin = {left: 80, right: 80, top: 50, bottom: 50 },
    width = 960 - margin.left - margin.right,
    height = 540 - margin.top - margin.bottom;

// Define SVG
var svg = d3.select("body")
    .append("svg")
    .attr("id", "svgmap")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Define map projection
var projection = d3
    .geoConicConformalSpain() // d3 composite projection for spain
    //.geoMercator()
    .scale(3000) // sets the map scale; default: 3000
    //.center([0, 40]) // long/lat offset in degs; only used with geoMercator()
                       // default: [0°, 0°]
    .translate([width/2, height/2]) // translate to the center of svg
                                    // default: [480, 250]
    ;

// Define path generator
var path = d3.geoPath().projection(projection);

// Define color scale
var color = d3.scaleThreshold() // Specify arbitrary breaks in continuous data
    .domain([1, 5, 25, 100, 250, 500, 1000, 2500]) // input is manual threshold value
    .range(d3.schemeOrRd[9]) // output is 9 colors (max) from schemeOrRd color scheme; colors correspond to blocks separated by 8 threshold values
    ;

// Test color scale
//console.log(color(500));

// Define legend
var legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${(width-500)}, ${height})`)
    ;

// Define legend scale
var legendXScale = d3.scaleSqrt()
    .domain([0, 3000]) // legend value range
    .rangeRound([0, 500]); // legend width

// Create legends out of rectangles
legend.selectAll("rect")
    .data(color.range().map(function(d) { // calls color.range() to extract threshold values/domain based on the color value/range
        
        //console.log(d); // color value
        
        d = color.invertExtent(d); // find the extent of threshold values in the domain/rectangle for the corresponding color value
        
        //console.log(d);
    
        // fill in missing values for the domains/rectangles on both edges
        if (d[0] == null) d[0] = legendXScale.domain()[0];
        if (d[1] == null) d[1] = legendXScale.domain()[1];
        
        //console.log(legendXScale.domain()[0]);
        
        //console.log(legendXScale.domain()[1]);
        
        return d;
    
    }))
    .enter().append("rect")
    .attr("height", 8)
    // convert threshold values into positions using legenXScale
    .attr("x", d => legendXScale(d[0]))
    .attr("width", d => legendXScale(d[1]) - legendXScale(d[0]))
    // convert threshold values into color values
    .attr("fill", d => color(d[0]));

// Add caption above the legend
legend.append("text")
    .attr("class", "caption")
    .attr("x", legendXScale.range()[0])
    .attr("y", -6)
    .attr("fill", "#000")
    .attr("text-anchor", "start")
    .attr("font-weight", "bold")
    .text("Population per square mile");

legend.call(d3.axisBottom(legendXScale)
    // Set the tick height
    .tickSize(13)
    // Set the numbers under ticks to be the threshold values defined by color
    .tickValues(color.domain()))
    // Remove the axis line on the top of the rectangles and the 2 edge ticks
    .select(".domain")
    .remove();


// Load csv data
d3.csv("Spain_Province_Population.csv").then(function(data) {
    // Print data to console as table, for verification
    //console.table(data);
    //console.log(data);
    
    // Format the data
    let provinces = data.map(function (d) {
        return {
            province: d.province,
            sex: d.sex,
            period: d.period,
            population: +d.population, // '+' means to convert string into number
            area: +d.area * 0.386102, // convert from km^2 to mi^2
            popDensity: +d.population / (+d.area * 0.386102)
        };
    });
    
    // Print provinces to console as table, for verification
    //console.table(provinces);
    
    // Extract the population density from each province and add it to a new array
    //let result = provinces.map(d => d.popDensity);
    //console.log(result);
    
    // Set the domain of color to be the population density range
    // not used with scaleThreshold()
    //color.domain(provinces.map(d => d.popDensity));

    // Print out the extent (min and max) of population density
    //console.log(d3.extent(provinces, d => d.popDensity));
    
    // Load json data
    d3.json("spain_2_geo.json").then(function(json) {

        // Reverse the winding order of coordinates in the json file from the mapshader
        json.features.forEach(function(feature) {
            if(feature.geometry.type == "MultiPolygon") {
                feature.geometry.coordinates.forEach(function(polygon) {
                    polygon.forEach(function(ring) {
                        ring.reverse(); 
                    })
                })
            }
            else if (feature.geometry.type == "Polygon") {
                feature.geometry.coordinates.forEach(function(ring) {
                    ring.reverse();
                })  
            }
        })


        // fitExtent automatically scales the map into svg (width and height)
        // only used with geoMercator()
        //projection.fitExtent([[margin.left, margin.top], [width-margin.right, height-margin.bottom]], json);
        
        // Merge the provinces data and GeoJSON
        // Loop through once for each provinces value
        for (let i = 0; i < provinces.length; i++) {
            // Grab province name from csv
            let dataProvince = provinces[i].province;
            // Grab province population from csv
            let dataPopulation = provinces[i].population;
            // Grab province population density from csv
            let dataPopDensity = provinces[i].popDensity;
            // Find the corresponding province inside the GeoJSON
            for (let j = 0; j < json.features.length; j++) {
                // Grab province name from json
                let jsonProvince = json.features[j].properties.NAME_2;
                if (dataProvince == jsonProvince) {
                    // Copy the province population into the JSON
                    json.features[j].properties.population = dataPopulation;
                    // Copy the population density into the JSON
                    json.features[j].properties.popDensity = dataPopDensity;
                    // Stop looking through the JSON
                    break;
                }
            }
        }


        //Bind data and create one path per GeoJSON feature
        svg.append("g")
            .attr("id", "map")
            .selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path) // call the path generator function
            // Color each province based on its population density
            .style("fill", function(d) {
                //Get province population density
                let popDensity = d.properties.popDensity;
                
                // Print province name
                //console.log(d.properties.NAME_2);
            
                if (popDensity) {
                    // Print province population and density
                    //console.log(d.properties.population);
                    //console.log(popDensity);

                    // Print color value
                    //console.log(color(popDensity));
                    
                    // If value exists…
                    return color(popDensity);
                } else {
                    // Print province not found
                    console.log("province not found");
                    
                    //If value is undefined, then color it grey
                    return "#ccc";
                }
            
            });

    });

});
