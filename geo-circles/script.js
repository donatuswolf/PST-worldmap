var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);;
var height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
var padding = 8;
var k;
var node;
var pointScale;

var factor = "population";

var factor = {
    population: {
        pScale: d3.scale.sqrt().domain([0, 700000000]).range([0, 75])
    },
    cri_rank: {
        pScale: d3.scale.linear().domain([1, 500]).range([0, 100])
    },
    cri_score: {
        pScale: d3.scale.sqrt().domain([1, 500]).range([0, 100])
    },
    gdp: {
        pScale: d3.scale.sqrt().domain([0, 7000000]).range([0, 75])
    }
}

var pixelLoc = d3.geo.mercator();
pixelLoc.scale(2000);

svg = d3.select('#map')
    .append('svg:svg')
    .attr('width', width)
    .attr('height', height);

drawMap("population");

function drawMap(input) {
    d3.json('coordinates.json', function (coordinates) {

        console.log(coordinates)
        var coords = [];
        var xs = [];
        var ys = []
        for (alias in coordinates) {
            coords.push(coordinates[alias]);
            xs.push(coordinates[alias][0]);
            ys.push(coordinates[alias][1]);
        }

        var minX = d3.min(xs);
        var maxX = d3.max(xs);
        var xScale = d3.scale.linear().domain([minX, maxX]).range([-50, -30]);

        var minY = d3.min(ys);
        var maxY = d3.max(ys);
        var yScale = d3.scale.linear().domain([minY, maxY]).range([-20, -10]);

        d3.json('countries.json', function (countries) {
            console.log(countries);

            pointScale = factor[input].pScale;

            nodes = []
            for (i = 0; i < countries.length; i++) {
                if (countries[i][input] != 0) {
                    node = countries[i];
                    node.coordinates = coordinates[node.alias];
                    node.cx = xScale(pixelLoc(node.coordinates)[0]);
                    node.cy = yScale(pixelLoc(node.coordinates)[1]);
                    node.radius = pointScale(node[input]);
                    nodes.push(node);
                }
            }

            force = d3.layout.force()
                .nodes(nodes)
                .links([])
                .size([width, height])
                .charge(function (d) {
                    -Math.pow(d.radius * 5.0, 2.0) / 8
                })
                .gravity(1.7)
                .on('tick', function (e) {
                    k = 10 * e.alpha;
                    for (i = 0; i < nodes.length; i++) {
                        nodes[i].x += k * nodes[i].cx
                        nodes[i].y += k * nodes[i].cy
                    }
                    svg.selectAll('circle')
                        .each(collide(.1, nodes, pointScale))
                        .attr('cx', function (node) {
                            return node.x;
                        })
                        .attr('cy', function (node) {
                            return node.y;
                        });

                    svg.selectAll('text')
                        .attr('x', function (node) {
                            return node.x;
                        })
                        .attr('y', function (node) {
                            return node.y + 5;
                        })
                        .attr('opacity', function (node) {
                            if (node.radius < 17) {
                                return 0;
                            }
                            return 1;
                        });;
                })
                .start();

            svg.selectAll('circle')
                .data(nodes)
                .enter().append('svg:circle')
                .attr('cx', function (node) {
                    return node.cx;
                })
                .attr('cy', function (node) {
                    return node.cy;
                })
                .attr('r', function (node) {
                    return node.radius;
                })
                .attr('class', function (node) {
                    return node.continent.replace(' ', '');
                });

            svg.selectAll('text')
                .data(nodes)
                .enter().append('svg:text')
                .text(function (node) {
                    return node.name;
                });

        });
    });
};

// Adapted from http://bl.ocks.org/3116713
var collide = function (alpha, nodes, scale) {
    var quadtree = d3.geom.quadtree(nodes);
    return function (d) {
        var r = d.radius + scale.domain()[1] + padding;
        var nx1 = d.x - r;
        var nx2 = d.x + r;
        var ny1 = d.y - r;
        var ny2 = d.y + r;
        quadtree.visit(function (quad, x1, y1, x2, y2) {
            if (quad.point && quad.point !== d) {
                var x = d.x - quad.point.x;
                var y = d.y - quad.point.y;
                var l = Math.sqrt(x * x + y * y)
                var r = d.radius + quad.point.radius + padding;
                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
    }
}

function changeData(d) {
    d3.select('svg').remove();
    drawMap(d)
}