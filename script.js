d3.select(window).on("resize", throttle);

var zoom = d3.behavior.zoom()
  .scaleExtent([1, 9])
  .on("zoom", move);


var width = document.getElementById('container').offsetWidth;
var height = width / 2;

var topo, projection, path, svg, g;

var graticule = d3.geo.graticule();

var tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");

setup(width, height);

function setup(width, height) {
  projection = d3.geo.mercator()
    .translate([(width / 2), (height / 2)])
    .scale(width / 2 / Math.PI);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)
    .on("click", click)
    .append("g");

  g = svg.append("g");

}

d3.json("data/world-topo-min.json", function (error, world) {

  var countries = topojson.feature(world, world.objects.countries).features;

  console.log(countries);
  topo = countries;
  draw(topo);

});

//// Create Map ////
function draw(topo) {

  svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);


  g.append("path")
    .datum({
      type: "LineString",
      coordinates: [
        [-180, 0],
        [-90, 0],
        [0, 0],
        [90, 0],
        [180, 0]
      ]
    })
    .attr("class", "equator")
    .attr("d", path);


  var country = g.selectAll(".country").data(topo);

  country.enter().insert("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("id", function (d, i) {
      return d.id;
    })
    .attr("title", function (d, i) {
      // console.log(d.properties)
      return d.properties.name;
    })
  // .attr("stroke", "black")
  // .attr("stroke-width", "0.5")

  //// Color ////

  //offsets for tooltips
  var offsetL = document.getElementById('container').offsetLeft + 20;
  var offsetT = document.getElementById('container').offsetTop + 10;

  // loadData("Climate-Risk-Index-2017", "CRI Rank")
  // loadData("co-emissions-capita-2017","CO2 emissions (tonnes)")
  loadData("GDP-per-capita", "GDP")

  //// load data set ////
  function loadData(file, factor) {
    fetch('data/' + file + '.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        console.log(data);

        function minValue() { // find minimum value
          min = +Infinity;

          for (var i = 0; i < data.length; i++) {
            if (data[i][factor] < min) {
              min = data[i][factor];
            }
          }
          return min;
        }

        function maxValue() { // find maximum value
          max = -Infinity;

          for (var i = 0; i < data.length - 1; i++) {
            if (data[i][factor] > max) {
              max = data[i][factor];
            }
          }
          return max;
        }

        var medium = (maxValue() - minValue()) / 2
        var anotherPivot = (maxValue() - minValue()) / 4
        var evensmallerPivot = (maxValue() - minValue()) / 6
        // console.log(medium)
        // console.log(anotherPivot)
        // map min and max values to be between 0 and 1
        var colorScale = d3.scale.linear()
          // .domain([minValue(),evensmallerPivot, anotherPivot, medium, maxValue()])
          // .range(['white', '#AD3131', '#6F0000', '#4D0000']);
          .domain([minValue(), maxValue()])
          .range(['#003BFF', '#FD857D']);

        console.log(minValue(), maxValue())


        country.attr("fill", function (d) {
          // Creating sub arrays with only matching objects across datasets
          var filtered = data.filter(element => {
            return element.Country === d.properties.name
          })
          // console.log(filtered)
          // If filtered is longer than 0 (which means that it actually has data)
          if (filtered.length !== 0) {
            // then print me data
            // console.log('I have data! I am', filtered[0].Country, 'and I have', filtered[0][factor])
            // and return the value I want scaled for the previously generated scale
            return colorScale(filtered[0][factor])
          } else {
            // If there are no data print a sad message :(
            // console.log('I have nothing :(')
            // And then return an arbitrary color so we can identify countries with no data attached
            return 'grey'
          }
        });
      });
  }


  //tooltips
  country
    .on("mousemove", function (d, i) {

      var mouse = d3.mouse(svg.node()).map(function (d) {
        return parseInt(d);
      });

      tooltip.classed("hidden", false)
        .attr("style", "left:" + (mouse[0] + offsetL) + "px;top:" + (mouse[1] + offsetT) + "px")
        .html(d.properties.name);

    })
    .on("mouseout", function (d, i) {
      tooltip.classed("hidden", true);
    });


  //EXAMPLE: adding some capitals from external CSV file
  // d3.csv("data/country-capitals.csv", function (err, capitals) {

  //   capitals.forEach(function (i) {
  //     addpoint(i.CapitalLongitude, i.CapitalLatitude, i.CapitalName);
  //   });

  // });

}


function redraw() {
  width = document.getElementById('container').offsetWidth;
  height = width / 2;
  d3.select('svg').remove();
  setup(width, height);
  draw(topo);
}


function move() {

  var t = d3.event.translate;
  var s = d3.event.scale;
  zscale = s;
  var h = height / 4;


  t[0] = Math.min(
    (width / height) * (s - 1),
    Math.max(width * (1 - s), t[0])
  );

  t[1] = Math.min(
    h * (s - 1) + h * s,
    Math.max(height * (1 - s) - h * s, t[1])
  );

  zoom.translate(t);
  g.attr("transform", "translate(" + t + ")scale(" + s + ")");

  //adjust the country hover stroke width based on zoom level
  d3.selectAll(".country").style("stroke-width", 1.5 / s);

}



var throttleTimer;

function throttle() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function () {
    redraw();
  }, 200);
}


//geo translation on mouse click in map
function click() {
  var latlon = projection.invert(d3.mouse(this));
  // console.log(latlon);
}


//function to add points and text to the map (used in plotting capitals)
function addpoint(lat, lon, text) {

  var gpoint = g.append("g").attr("class", "gpoint");
  var x = projection([lat, lon])[0];
  var y = projection([lat, lon])[1];

  gpoint.append("svg:circle")
    .attr("cx", x)
    .attr("cy", y)
    .attr("class", "point")
    .attr("r", 1.5);

  //conditional in case a point has no associated text
  if (text.length > 0) {

    gpoint.append("text")
      .attr("x", x + 2)
      .attr("y", y + 2)
      .attr("class", "text")
      .text(text);
  }

}