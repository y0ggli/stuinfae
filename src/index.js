import * as d3 from 'd3';
import * as topojson from 'topojson';


const colors = {
    area_first: '#00e676',
    area_second: '#66ffa6',
    prod_first: '#e65800',
    prod_second: '#ff9c66',
    highlight: '#ff6691'
}

let width = 900;
let height = 900;

const svg = d3.select('.container')
    .append('svg')
    .attr('height', height)
    .attr('width', width);

let projection = d3.geoMercator()
    .scale(500)
    .translate([width/4, height / 2.5]);

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
            '<div class="info area' + area.Years[0].Year + '">' +
                '<div class="symbol"></div>' +
                '<p class="year">' +  area.Years[0].Year + ': ' + '</p>'+
                '<p class="value">' + area.Years[0].Value.toLocaleString() + ' ' + area.Unit + '</p>' +
            '</div>' +
            '<div class="info area' + area.Years[1].Year + '">' +
                '<div class="symbol"></div>' +
                '<p class="year">' +  area.Years[1].Year + ': ' + '</p>'+
                '<p class="value">' + area.Years[1].Value.toLocaleString() + ' ' + area.Unit + '</p>' +
            '</div>' +
            '<div class="info prod' + prod.Years[0].Year + '">' +
                '<div class="symbol"></div>' +
                '<p class="year">' +  prod.Years[0].Year + ': ' + '</p>'+
                '<p class="value">' + prod.Years[0].Value.toLocaleString() + ' ' + prod.Unit + '</p>' +
            '</div>'+
            '<div class="info prod' + prod.Years[1].Year + '">' +
                '<div class="symbol"></div>' +
                '<p class="year">' +  prod.Years[1].Year + ': ' + '</p>'+
                '<p class="value">' + prod.Years[1].Value.toLocaleString() + ' ' + prod.Unit + '</p>' +
            '</div>'

        )
}

function handleMouseOut() {
    tooltip.transition()
        .duration(200);
        //.style("opacity", 0);
    
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
        .attr("fill", colors.area_second)
        .attr('stroke', colors.area_second)
        .attr("transform", d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        })
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);


        enterCircles.append("circle")
        .attr('class', 'bubble')
        .attr("r", d=> {return radius(getValueForYear(d,1980))})
        .attr('stroke', colors.area_first)
        .attr('fill', d => {
            //console.log(getMaxYear(d).Year);
            if (getMaxYear(d).Year === 1980){
                return 'none'
            } else {
                return colors.area_first
            }
        })
        .attr("transform", d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        })
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);
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
        .attr('stroke',colors.prod_second)
        .attr('fill',colors.prod_second)
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
        .attr('stroke',colors.prod_first)
        .attr('fill',d => {
            if (getMaxYear(d).Year === 1980){
                return 'none'
            } else {
                return colors.prod_first
            }
        })
        .attr("transform", (d) => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
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



