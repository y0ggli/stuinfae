import * as d3 from 'd3';
import * as topojson from 'topojson';


const colors = {
/*    area_1980: '#00e676',
    area_2016: '#69ff73',
    prod_1980: '#ebd403',
    prod_2016: '#f5ff69',
    highlight: '#be69ff'*/

    area_1980: '#00e676',
    area_2016: '#66ffa6',
    prod_1980: '#2d87fc',
    prod_2016: '#66bfff',
    highlight: '#ff6691'
};

let width = 700;
let height = 900;

const svg = d3.select('.container')
    .append('svg')
    .attr('height', height)
    .attr('width', width);

let projection = d3.geoMercator()
    .scale(500)
    .translate([width / 3, height / 2.5]);

let path = d3.geoPath().projection(projection);
let areaHarvested;
let production;
let yieldHgHa;
let g;
let tooltip;
let transDelay = 200;
let transDuration = 800;
let rectWidth = 5;

//Load Data and Draw
Promise.all([
    d3.csv('data/Cereals1980-2016.csv'),
    d3.json('data/africa.json')
])
    .then(([data, africa]) => {
        data.forEach(d => {
            d.Year = +d.Year;
            d.Value = +d.Value;
        });
        //console.log(data);
        //console.log(africa);
        draw(data, africa);
    }).catch(e => {
    throw e;
});


function draw(data, africa) {

    g = svg.append('g');

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
                if (p.properties.geounit === d["Area"])
                    return true
            }
        }
    }).sort((a, b) => {
        return b.Year - a.Year
    });

    areaHarvested = combineValues(areaHarvested);
    //console.log(areaHarvested);


    //Filter Production Data
    production = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Production")
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if (p.properties.geounit === d["Area"])
                    return true
            }
    }).sort((a, b) => {return b.Year - a.Year});

    production = combineValues(production);
    //console.log(production);

    //Filter Yield Data
    yieldHgHa = data.filter(d => {
        if ((d.Year === 2016 || d.Year === 1980) && d.Element === "Yield")
            for (let i = 0; i < paths.data().length; i++) {
                let p = paths.data()[i];
                if (p.properties.geounit === d["Area"])
                    return true
            }
    }).sort((a, b) => {return b.Year - a.Year});
    yieldHgHa = combineValues(yieldHgHa);
    //console.log(yieldHgHa);


    drawAreaHarvested(g, areaHarvested, paths);

    drawProduction(g, production, paths);

}


function drawMap(g, africa) {
    return g.selectAll('path')
        .data(topojson.feature(africa, africa.objects.continent_Africa_subunits).features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('id', d => {
            return d.properties.geounit
        })
        .attr('class', 'africa')
        .on("mouseover",d => handleMouseOver(d,true))
        .on("mouseout", handleMouseOut);
}

function drawAreaHarvested(g, data, map) {
    //define circle size
    let radius = d3.scaleSqrt()
        .domain([d3.min(data, d => {
            return getMinYear(d).Value
        }), d3.max(data, d => {
            return getMaxYear(d).Value
        })])
        .range([2, 20]);

    //Area Harvested
    let enterCircles = g.selectAll('circle')
        .data(data)
        .enter();


    enterCircles.append("circle")
        .on("mouseover", d=> activateMouseOver(d,map))
        .on("mouseout", d=> deactivateMouseOver(d,map))
        .attr('class', 'bubble')
        .attr("r", 0)
        .attr("fill", colors.area_2016)
        .attr('stroke', colors.area_2016)
        .attr("transform", d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + path.centroid(p) + ")";
                }
            }
        })
        .transition()
        .duration(transDuration)
        .delay(() => transDelay)
        .attr("r", d => {
            return radius(getValueForYear(d, 2016))
        });


    enterCircles.append("circle")
        .on("mouseover", d=> activateMouseOver(d,map))
        .on("mouseout", d=> deactivateMouseOver(d,map))
        .attr('class', 'bubble')
        .attr("r", 0)
        .attr('stroke', colors.area_1980)
        .attr('fill', d => {
            if (getMaxYear(d).Year === 1980) {
                return 'none'
            } else {
                return colors.area_1980
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
        .transition()
        .duration(transDuration)
        .delay(() => transDelay)
        .attr("r", d => {
            return radius(getValueForYear(d, 1980))
        });


}

function drawProduction(g, data, map) {

    //define rect height
    let height = d3.scaleLinear()
        .domain([d3.min(data, d => {
            return getMinYear(d).Value
        }), d3.max(data, d => {
            return getMaxYear(d).Value
        })])
        .range([2, 35]);

    //Production
    let rect = g.selectAll('rect')
        .data(data)
        .enter();

    rect.append('rect')
        .on("mouseover", d=> activateMouseOver(d,map))
        .on("mouseout", d=> deactivateMouseOver(d,map))
        .attr('class', 'bar')
        .attr('width', rectWidth)
        .attr('height', 0)
        .attr('stroke', colors.prod_2016)
        .attr('fill', colors.prod_2016)
        .attr("transform", (d) => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + (path.centroid(p)[0] - rectWidth / 2) + "," + path.centroid(p)[1] + ")";
                }
            }
        })
        .transition()
        .duration(transDuration)
        .delay(() => transDelay)
        .attr('height', d => {
            return height(getValueForYear(d, 2016))
        })
        .attr('transform', d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + (path.centroid(p)[0] - rectWidth / 2) + "," + (path.centroid(p)[1] - height(getValueForYear(d, 2016))) + ")";
                }
            }
        });

    rect.append('rect')
        .on("mouseover", d=> activateMouseOver(d,map))
        .on("mouseout", d=> deactivateMouseOver(d,map))
        .attr('class', 'bar')
        .attr('width', rectWidth)
        .attr('height', 0)
        .attr('stroke', colors.prod_1980)
        .attr('fill', d => {
            if (getMaxYear(d).Year === 1980) {
                return 'none'
            } else {
                return colors.prod_1980
            }
        })
        .attr("transform", (d) => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + (path.centroid(p)[0] - rectWidth / 2) + "," + path.centroid(p)[1] + ")";
                }
            }
        })
        .transition()
        .duration(transDuration)
        .delay(() => transDelay)
        .attr('height', d => {
            return height(getValueForYear(d, 1980))
        })
        .attr('transform', d => {
            for (let i = 0; i < map.data().length; i++) {
                let p = map.data()[i];
                if (p.properties.geounit === d["Name"]) {
                    return "translate(" + (path.centroid(p)[0] - rectWidth / 2) + "," + (path.centroid(p)[1] - height(getValueForYear(d, 1980))) + ")";
                }
            }
        });

}

function activateMouseOver(d,map) {
    for (let i = 0; i < map.data().length; i++) {
        let p = map.data()[i];
        if (p.properties.geounit === d["Name"]) {
            handleMouseOver(p,false);
        }
    }
}

function deactivateMouseOver(d,map) {
    for (let i = 0; i < map.data().length; i++) {
        let p = map.data()[i];
        if (p.properties.geounit === d["Name"]) {
            handleMouseOut(p);
        }
    }
}


function handleMouseOver(d,playanimation) {
    let area = getYearsForArea(d, areaHarvested);
    let prod = getYearsForArea(d, production);
    let yie = getYearsForArea(d,yieldHgHa);
    //console.log(area)
    //console.log(prod)
    //console.log(yie)
    document.getElementById(d.properties.geounit).classList.add('hover');
    tooltip
        .transition()
        .duration(200)
        .style("opacity", 1);

    let t0;
    let t1;
    let a0;
    let a1;
    let p0;
    let p1;

    let ha_line = "ha_line";
    let ha_tip = "ha_tip";
    let wheat_line = "wheat_line";
    let wheat_tip = "wheat_tip";

    if (playanimation) {
        ha_line = "ha_line_animated";
        ha_tip = "ha_tip_animated";
        wheat_line = "wheat_line_animated";
        wheat_tip = "wheat_tip_animated"
    }


    if (area == null || prod == null || yie == null) {
        tooltip.html(
            "<h2>No Data :'(</h2>"
        )
    } else {
        t0 = yie.Years.length > 0 ? Math.round(yie.Years[0].Value / 1000) : 0;
        t1 = yie.Years.length > 1 ? Math.round(yie.Years[1].Value / 1000) : 0;
        a0 = area.Years.length > 0 ? area.Years[0] : {Year:2016, Value:0};
        a1 = area.Years.length > 1 ? area.Years[1] : {Year:1980, Value:0};
        p0 = prod.Years.length > 0 ? prod.Years[0] : {Year:2016, Value:0};
        p1 = prod.Years.length > 1 ? prod.Years[1] : {Year:1980, Value:0};
        tooltip.html(
            '<h2>' + area.Name + '</h2>' +
            '<h3>Area harvested</h3>' +
            '<div class="info area' + a1.Year + '">' +
            '<div class="circle"></div>' +
            '<p class="year">' + a1.Year + ': ' + '</p>' +
            '<p class="value">' + a1.Value.toLocaleString() + ' ' + area.Unit + '</p>' +
            '</div>' +
            '<div class="info area' + a0.Year + '">' +
            '<div class="circle"></div>' +
            '<p class="year">' + a0.Year + ': ' + '</p>' +
            '<p class="value">' + a0.Value.toLocaleString() + ' ' + area.Unit + '</p>' +
            '</div>' +
            '<h3>Production</h3>' +
            '<div class="info prod' + p1.Year + '">' +
            '<div class="rect"></div>' +
            '<p class="year">' + p1.Year + ': ' + '</p>' +
            '<p class="value">' + p1.Value.toLocaleString() + ' ' + prod.Unit + '</p>' +
            '</div>' +
            '<div class="info prod' + p0.Year + '">' +
            '<div class="rect"></div>' +
            '<p class="year">' + p0.Year + ': ' + '</p>' +
            '<p class="value">' + p0.Value.toLocaleString() + ' ' + prod.Unit + '</p>' +
            '</div>'+
            '<h3>Yield</h3>' +
            '<div id="yield" class="ha">' +
            '<div class="'+ha_line+'"></div>' +
            '<p class="'+ha_tip+'">1 ha</p>' +
            '<div class="'+wheat_line+'"></div>' +
            '<p class="'+wheat_tip+'">100 kg</p>' +
            '</div>'
        )
    }
    let wheat = d3.select("#yield").append("svg");
    let haSquare = 225;
    let wheatWidth = 25;
    let wheat1980 = "assets/wheat1980.svg";
    let wheat2016 = "assets/wheat2016.svg";
    if (t0 > t1) {
        drawYield(t0, wheat2016);
        drawYield(t1, wheat1980);
    } else {
        drawYield(t1, wheat1980);
        drawYield(t0, wheat2016);
    }

    function drawYield(amount, svg) {
        for(let i = 0; i < amount; i++) {
            wheat
                .append("svg:image")
                .attr("xlink:href", svg)
                .attr("x", wheatWidth * (i % 10))
                .attr("y", haSquare - wheatWidth * Math.floor(i/10))
                .attr("width", wheatWidth)
                .attr("height", wheatWidth);
        }


    }


}

function handleMouseOut(d) {
    tooltip.transition()
        .duration(200)
        .style("opacity", 0);

    document.getElementById(d.properties.geounit).classList.remove('hover');

}

function getMinYear(area) {
    let min = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value < min) {
            min = year;
        }
    }
    return min;
}

function getMaxYear(area) {
    let max = area.Years[0].Value;
    for (let year of area.Years) {
        if (year.Value > max) {
            max = year;
        }
    }
    return max;
}

function getValueForYear(area, year) {
    let a = area.Years.find(val => val.Year === year);
    return (a == null) ? 0 : a.Value;

}

function getYearsForArea(area, arr) {
    return arr.find(val => val.Name === area.properties.geounit);
}

function combineValues(areas) {
    let combinedAreas = [];
    for (let area of areas) {
        let obj = combinedAreas.find(val => {
            return val.Name === area.Area
        });
        if (obj != null) {
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



