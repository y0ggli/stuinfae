import * as d3 from 'd3';
import * as topojson from 'topojson';

let width = 900;
let height = 900;

const svg = d3.select('.container')
    .append('svg')
    .attr('height', height)
    .attr('width', width);

let projection = d3.geoMercator()
    .scale(400)
    .translate([width / 2, height / 2]);

let path = d3.geoPath().projection(projection);
let areaHarvested;
let production;
let g;
let tooltip;

//Load Data and Draw
Promise.all([
    d3.csv('/data/Cereals1980-2016.csv'),
    d3.json('/data/africa.json')
])
    .then(([data, africa]) =>  {
        data.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
        //console.log(data);
        //console.log(africa);
        draw(data, africa);
    }).catch( e => {
    throw e;
});


function draw(data, africa) {

    g = svg.append('g')
        .style('transform', 'translate(-25%, -20%)');

    //Map
    let paths = drawMap(g, africa);

    tooltip = d3.select('.container').append('div')
        .attr("class", "tooltip")
        .style("opacity", 0);

    //Filter Area Harvested Data
    areaHarvested = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Area harvested") {
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if( p.properties.geounit === d["Area"])
                    return true
            }
        }
    }).sort((a,b) => { return b.Year - a.Year});

    areaHarvested = combineValues(areaHarvested);
    //console.log(areaHarvested);

    drawAreaHarvested(g, areaHarvested, paths);



    //Filter Production Data
    production = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Production")
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if( p.properties.geounit === d["Area"])
                    return true
            }
    }).sort((a,b) => { return b.Year - a.Year});

    production = combineValues(production);
    //console.log(production);

    drawProduction(g, production, paths);

}


function drawMap(g, africa){
  return g.selectAll('path')
        .data(topojson.feature(africa, africa.objects.continent_Africa_subunits).features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('name', d => {return d.properties.geounit})
        .attr('class', 'africa')
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut);
}

function handleMouseOver(d) {
    let area = getYearsForArea(d,areaHarvested);
    let prod = getYearsForArea(d,production);
    console.log(area)
    console.log(prod)
        tooltip
        .transition()
        .duration(200)
        .style("opacity", .9);

        tooltip.html(
            '<h2>' + area.Name +'</h2>' +
        '<p>' + area.Years[0].Year + ': ' + area.Years[0].Value + ' ' + area.Unit + '</p>'
        )
        //.style("transform", "translate(" + path.centroid(d)[0] + "px," + path.centroid(d)[1] + "px" + ")")
/*        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");*/

    
}

function handleMouseOut() {
    tooltip.transition()
        .duration(200)
        .style("opacity", 0);
    
}


function drawAreaHarvested(g, data, map) {
    //define circle size
    let radius = d3.scaleSqrt()
        .domain([d3.min(data, d=> {return getMinYear(d).Value}), d3.max(data, d=> {return getMaxYear(d).Value})])
        .range([1 , 15]);

    //Area Harvested
    let enterCircles = g.selectAll('circle')
        .data(data)
        .enter();


        enterCircles.append("circle")
        .attr('class', 'bubble')
        .attr("r", d=> {return radius(getValueForYear(d,2016))})
        .attr("fill", '#66ffa6')
        .attr('stroke', '#66ffa6')
        .attr("transform", d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        });


        enterCircles.append("circle")
        .attr('class', 'bubble')
        .attr("r", d=> {return radius(getValueForYear(d,1980))})
        .attr('stroke', '#00e676')
        .attr('fill', d => {
            //console.log(getMaxYear(d).Year);
            if (getMaxYear(d).Year === 1980){
                return 'none'
            } else {
                return '#00e676'
            }
        })
        .attr("transform", d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        });
}

function drawProduction(g, data, map) {

    //define rect height
    let height = d3.scaleLinear()
        .domain([d3.min(data, d => {return getMinYear(d).Value}), d3.max(data, d => {return getMaxYear(d).Value})])
        .range([2,30]);

    //Production
    let rect = g.selectAll('rect')
        .data(data)
        .enter();

        rect.append('rect')
        .attr('class', 'bar')
        .attr('width',4)
        .attr('height', d =>{return height(getValueForYear(d,2016))})
        .attr('stroke','#ff9c66')
        .attr('fill','#ff9c66')
        .attr("transform", (d) => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    //console.log(p.properties.geounit+ " " +path.centroid(p));
                    return "translate(" + (path.centroid(p)[0] - 2) + ","+ (path.centroid(p)[1] - height(getValueForYear(d,2016))) + ")";
                }
            }
        });

        rect.append('rect')
        .attr('class', 'bar')
        .attr('width',4)
        .attr('height', d =>{return height(getValueForYear(d,1980))})
        .attr('stroke','#e65800')
        .attr('fill',d => {
            //console.log(getMaxYear(d).Year);
            if (getMaxYear(d).Year === 1980){
                return 'none'
            } else {
                return '#e65800'
            }
        })
        .attr("transform", (d) => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    //console.log(p.properties.geounit+ " " +path.centroid(p));
                    return "translate(" + (path.centroid(p)[0] - 2) + ","+ (path.centroid(p)[1] - height(getValueForYear(d,1980))) + ")";
                }
            }
        });
}


function combineValues(areas) {
    let combinedAreas = [];
    for( let area of areas) {
        let obj = combinedAreas.find(val => {return val.Name === area.Area});
        if (obj !== undefined ){
            obj.Years.push({
                Year: area.Year,
                Value: area.Value
            });
        } else {
            let obj = {
                Name: area.Area,
                Element: area.Element,
                Unit: area.Unit,
                Years: [{
                     Year: area.Year,
                     Value: area.Value
                    }
                ]
            };
            combinedAreas.push(obj);
        }
    }
    return combinedAreas;
}


function getMinYear(area) {
    let min = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value < min){
            min = year;
        }
    }
    return min;
}

function getMaxYear(area) {
    let max = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value > max){
            max = year;
        }
    }
    return max;
}

function getValueForYear(area, year) {
    let a = area.Years.find(val => val.Year === year);
    return (a === undefined) ? 0 : a.Value;

}

function getYearsForArea(area, arr) {
    let a =  arr.find( val => val.Name === area.properties.geounit);
    return a;
}



