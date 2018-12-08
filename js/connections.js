var nodes = [];
var edges = [];
var lookup = {};
var edgeColors = [];
var circleColors = [];
var canvas;
var zoom;

document.querySelector(".button-random").addEventListener("click", drawRandom);
document.querySelector(".button-reset").addEventListener("click", reset);
window.addEventListener("resize", draw);

drawRandom();

// create 1-100 random nodes
function populateNodes() {
  for (var i = 0; i < Math.floor(Math.random() * 100 + 1); i++) {
      let n = {
          number: i + 1,
          x: Math.floor(Math.random() * 201 - 100),
          y: Math.floor(Math.random() * 201 - 100),
          value: String.fromCharCode(
              // assign a random letter
              Math.floor(Math.random() * 26) + 97
          )
      };

      nodes.push(n);
  }
}

/** create a lookup dictionary
/** makes it easier to extract node 
/** coordinates by the node's number */
function populateLookup() {
  for (var i = 0; i < nodes.length; i++) {
      lookup[nodes[i].number] = {
          x: nodes[i].x,
          y: nodes[i].y
      };
  }
}

// for each node, create an edge (50/50 chance)
function populateEdges() {
  for (var i = 0; i < nodes.length; i++) {
      if (Math.random() >= 0.5) {
          let from = Math.floor(Math.random() * nodes.length + 1);
          let to = Math.floor(Math.random() * nodes.length + 1);

          let e = {
              numberFrom: from,
              numberTo: to
          };

          edges.push(e);
      }
  }
}

function generateColors(number) {
  // random color for edges
  function getRandColor() {
      /** 1. range: Math.random() * 0xFFFFFF + 1 (or 1<<24)
      /** 2. |0 to floor the value
      /** 3. '00000' and slice() for padding with zeroes */
      let color = '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
      while (color === "#ffffff") {
          color = '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6);
      }
      return color;
  }

  let colors = [];
  for (let i = 0; i < number; i++) {
      colors.push(getRandColor());
  }

  return colors;
}

function createSVG() {
  let helperBox = document.querySelector(".row-fluid div:nth-of-type(1)");
  let box = document.querySelector("#canvas");
  let w = box.clientWidth,
      h = box.clientHeight - helperBox.clientHeight,
      radiusDefault = Math.min(w, h) * 0.03,
      borderDefault = 3,
      padding = (radiusDefault + borderDefault) * 2;

  zoom = d3.zoom()
      .on("zoom", function() {
          // zoom the foreground
          mainArea.attr("transform", d3.event.transform);
          // rescale axis
          let scaleYNew = d3.event.transform.rescaleY(scaleY);
          let scaleXNew = d3.event.transform.rescaleX(scaleX);
          // rescale circle parameters
          let fixedRatio = d3.zoomTransform(this).k;
          let radius = radiusDefault / fixedRatio;
          let border = borderDefault / fixedRatio;
          // update circle parameters
          svg.selectAll("circle")
              .attr("cx", d => scaleXNew(d.x))
              .attr("cy", d => scaleYNew(d.y))
              .attr("r", radius)
              .style("stroke-width", border);
          // update text parameters
          svg.selectAll("text")
              .attr("x", d => scaleXNew(d.x))
              .attr("y", d => scaleYNew(d.y))
              .attr("font-size", radius + "px");
          // update edge parameters
          svg.selectAll(".edge")
              .attr("x1", e => scaleXNew(lookup[e.numberFrom].x))
              .attr("y1", e => scaleYNew(lookup[e.numberFrom].y))
              .attr("x2", e => getCircleBorderXY(e, radius, scaleXNew, scaleYNew)[0])
              .attr("y2", e => getCircleBorderXY(e, radius, scaleXNew, scaleYNew)[1])
              .style("stroke-width", border);
      });

  canvas = d3.select("#canvas");
  let svg = canvas.append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .call(zoom);

  // we need the mainArea (foreground)
  // for the zoom to work properly
  let mainArea = svg.append("g");

  // set up axis ranges
  let rangeX = function(nodes) {
      x1 = d3.min(nodes, n => n.x);
      x2 = d3.max(nodes, n => n.x);

      return [x1, x2];
  };

  let rangeY = function(nodes) {
      y1 = d3.min(nodes, n => n.y);
      y2 = d3.max(nodes, n => n.y);

      return [y1, y2];
  };

  // set up scales
  let scaleX = d3.scaleLinear()
      .domain(rangeX(nodes))
      .range([padding, w - padding]);

  let scaleY = d3.scaleLinear()
      .domain(rangeY(nodes))
      .range([h - padding, padding]);

  // append defs for arrow markers
  let defs = mainArea.append("defs")

  // this way arrows have the same
  // color as edges
  function marker(color) {
      defs.append("marker")
          .attr("id", color.replace("#", ""))
          .attr("refX", 5)
          .attr("refY", 2)
          .attr("markerWidth", 6)
          .attr("markerHeight", 4)
          .attr("orient", "auto")
          .style("fill", color)
          .append("path")
          .attr("d", "M 0,0 V 4 L6,2 Z")
          .style("fill", color);

      return "url(" + color + ")";
  }

  // get the circle border position so that
  // we can draw a line to it
  function getCircleBorderXY(edge, radius = radiusDefault,
      sX = scaleX, sY = scaleY) {
      sourceX = sX(lookup[edge.numberFrom].x);
      sourceY = sY(lookup[edge.numberFrom].y);

      targetX = sX(lookup[edge.numberTo].x);
      targetY = sY(lookup[edge.numberTo].y);

      if (sourceX === targetX && sourceY === targetY) {
          return [sourceX, sourceY];
      }

      diffX = targetX - sourceX;
      diffY = targetY - sourceY;

      // length of the path from center to center
      pathLength = Math.sqrt((diffX * diffX) + (diffY * diffY));

      // x and y distances from center to the outside edge
      offsetX = (diffX * radius) / pathLength;
      offsetY = (diffY * radius) / pathLength;

      return [targetX - offsetX, targetY - offsetY];
  }

  // add edges to the foreground
  let edge = mainArea.selectAll("edge")
      .data(edges)
      .enter()
      .append("line")
      .attr("class", "edge")
      .attr("x1", e => scaleX(lookup[e.numberFrom].x))
      .attr("y1", e => scaleY(lookup[e.numberFrom].y))
      .attr("x2", e => getCircleBorderXY(e)[0])
      .attr("y2", e => getCircleBorderXY(e)[1])
      .style("fill", "none")
      .style("stroke-width", borderDefault)
      .style("stroke", (e, i) => edgeColors[i])
      .attr("marker-end", (e, i) => marker(edgeColors[i]));

  // group nodes together
  let node = mainArea.selectAll("node")
      .data(nodes)
      .enter()
      .append("g");

  // add circles to the foreground
  node.append("circle")
      .attr("class", "node")
      .attr("cx", function(node) { return scaleX(node.x) })
      .attr("cy", function(node) { return scaleY(node.y) })
      .attr("r", radiusDefault)
      .style("stroke", (c, i) => circleColors[i])
      .style("stroke-width", borderDefault)
      .style("fill", "white");

  // add text to the foreground
  node.append("text")
      .text(function(node) { return node.value })
      .attr("x", function(node) { return scaleX(node.x) })
      .attr("y", function(node) { return scaleY(node.y) })
      .attr("dy", ".3em")
      .attr("font-size", radiusDefault + "px")
      .style("fill", "#333")
      .style("text-anchor", "middle");
}

function drawRandom() {
  nodes = [];
  edges = [];
  lookup = {};

  populateNodes();
  populateLookup();
  populateEdges();
  edgeColors = generateColors(edges.length);
  circleColors = generateColors(nodes.length);

  draw();
}

function draw() {
  if (canvas) canvas.selectAll("*").remove();
  createSVG();
}

function reset() {
  d3.select('#canvas')
      .select('svg')
      .call(zoom.transform, d3.zoomIdentity);
}