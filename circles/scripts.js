var width = window.innerWidth
	|| document.documentElement.clientWidth
	|| document.body.clientWidth

	var height = window.innerHeight
	|| document.documentElement.clientHeight
	|| document.body.clientHeight

var type = "business",
    time = "2011-01";


console.log(time);

window.onload = function () {
    // var width = 960,
    //     height = 800;


    var padding = 1.5, // separation between same-color nodes
        clusterPadding = 60, // separation between different-color nodes
        maxRadius = 12;

    var color = d3.scale.ordinal()
        // .range(['grey', 'blue', 'green', 'black', 'red', 'yellow']);
        .range(['grey', '#05668D', '#028090', '#00A896', '#02C39A', '#F0F3BD']);

    d3.text("data/purpose.csv", function (error, text) {
        if (error) throw error;
        var colNames = "residence,region,subRegion,period,business,pleasure,visitRelatives,conference,study,exhibition,medicalTreatment,others,unstated\n" + text;
        var data = d3.csv.parse(colNames);
        
        data.forEach(function (d) {
            // d.period = new Date(d.period);
            d.business = +d.business;
            d.pleasure = +d.pleasure;
            d.visitRelatives = +d.visitRelatives;
            d.conference = +d.conference;
            d.study = +d.study;
            d.exhibition = +d.exhibition;
            d.medicalTreatment = +d.medicalTreatment;
            d.others = +d.others;
            d.unstated = +d.unstated;
        });

        console.log(data);

        //filter data down to one month
        var data_filtered = [];
        data.forEach(function (d) {
            if (d.period == time) {
                data_filtered.push(d);
            }
        });

        console.log(data_filtered);

        //unique cluster/group id's
        var cs = [];
        data_filtered.forEach(function (d) {
            if (!cs.contains(d.region)) {
                cs.push(d.region);
            }
        });

        var n = data_filtered.length, // total number of nodes
            m = cs.length; // number of distinct clusters

        //create clusters and nodes
        var clusters = new Array(m);
        var nodes = [];
        for (var i = 0; i < n; i++) {
            nodes.push(create_nodes(data_filtered, i));
        }

        var force = d3.layout.force()
            .nodes(nodes)
            .size([width, height])
            .gravity(.02)
            .charge(0)
            .on("tick", tick)
            .start();

        var svg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height);


        var node = svg.selectAll("circle")
            .data(nodes)
            .enter().append("g").call(force.drag);


        node.append("circle")
            .style("fill", function (d) {
                return color(d.cluster);
            })
            .attr("r", function (d) {
                return d.radius
            })


        node.append("text")
            .attr("dy", ".3em")
            .style("text-anchor", "middle")
            .text(function (d) {
                return d.text.substring(0, d.radius / 3);
            });


        function create_nodes(data_filtered, node_counter) {
            var i = cs.indexOf(data_filtered[node_counter].region),
                r = Math.sqrt((i + 1) / m * -Math.log(Math.random())) * maxRadius,

                min = d3.min(data_filtered, function (d) {
                    return d[type];
                }),
                max = d3.max(data_filtered, function (d) {
                    return d[type];
                }),

                map = d3.scale.linear()
                .domain([min, max])
                .range([30, 100]),

                d = {
                    cluster: i,
                    radius: map(data_filtered[node_counter][type]),
                    text: data_filtered[node_counter].residence,
                    x: Math.cos(i / m * 2 * Math.PI) * 200 + width / 2 + Math.random(),
                    y: Math.sin(i / m * 2 * Math.PI) * 200 + height / 2 + Math.random()
                };

            if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
            return d;
        };



        function tick(e) {
            node.each(cluster(10 * e.alpha * e.alpha))
                .each(collide(.5))
                .attr("transform", function (d) {
                    var k = "translate(" + d.x + "," + d.y + ")";
                    return k;
                })

        }

        // Move d to be adjacent to the cluster node.
        function cluster(alpha) {
            return function (d) {
                var cluster = clusters[d.cluster];
                if (cluster === d) return;
                var x = d.x - cluster.x,
                    y = d.y - cluster.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + cluster.radius;
                if (l != r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    cluster.x += x;
                    cluster.y += y;
                }
            };
        }

        // Resolves collisions between d and all other circles.
        function collide(alpha) {
            var quadtree = d3.geom.quadtree(nodes);
            return function (d) {
                var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                    nx1 = d.x - r,
                    nx2 = d.x + r,
                    ny1 = d.y - r,
                    ny2 = d.y + r;
                quadtree.visit(function (quad, x1, y1, x2, y2) {
                    if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
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
            };
        }
    });

    Array.prototype.contains = function (v) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === v) return true;
        }
        return false;
    };
}