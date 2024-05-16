// Found at https://stackoverflow.com/questions/25405359/how-can-i-select-last-child-in-d3-js
d3.selection.prototype.first = function() {
    return d3.select(this.nodes()[0]);
};
d3.selection.prototype.last = function() {
    return d3.select(this.nodes()[this.size() - 1]);
};
      

var glyph_module_controller = {
    
    constants: {
        MIN_NUMBER_LINES:4,
        LINE_DENSITY_FACTOR: 45, //larger number = less dense
        MARGIN:{
        left: 40,
        right: 40,
        top: 0,
        bottom: 60
        },
        PADDING: 35,
        BLUR: 3,
        OPACITY: .6,
        SW: 7
    },

    define_blur: function(){
        defs = d3.selectAll('svg')
            .append('defs');
        defs.append('filter')
            .attr('id', 'blur-def')
            .append('feGaussianBlur')
            .attr('in', 'SourceGraphic')
            .attr('stdDeviation', this.constants.BLUR);
    },

    define_top_gradient_mask: function(){
        lin_grad = d3.select('defs')
                    .append('linearGradient')
                    .attr('id', 'top-gradient')
                    .attr('y2', 1)
                    .attr('x2', 0);

        lin_grad.append('stop')
                .attr('offset', 0)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 0);

        lin_grad.append('stop')
                .attr('offset', 0.3)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 0.6);

        lin_grad.append('stop')
                .attr('offset', 1)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 1);

        mask = d3.select('defs')
                .append('mask')
                .attr('id', 'fade-up')
                .attr('maskContentUnits', 'objectBoundingBox');

        mask.append('rect')
                .attr('width', 1)
                .attr('height', 1)
                .attr('fill', 'url(#top-gradient)')

    },
  
    define_bottom_gradient_mask: function(){
        lin_grad = d3.select('defs')
                        .append('linearGradient')
                        .attr('id', 'bottom-gradient')
                        .attr('y2', 1)
                        .attr('x2', 0);

        lin_grad.append('stop')
                    .attr('offset', 0)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 1);

        lin_grad.append('stop')
                    .attr('offset', 0.7)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 0.6);
        
        lin_grad.append('stop')
                    .attr('offset', 1)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 0);

        mask = d3.select('defs')
                    .append('mask')
                    .attr('id', 'fade-down')
                    .attr('maskContentUnits', 'objectBoundingBox');

        mask.append('rect')
                .attr('width', 1)
                .attr('height', 1)
                .attr('fill', 'url(#bottom-gradient)');
    },

    define_dual_gradient_mask: function(){
        lin_grad = d3.select('defs')
                        .append('linearGradient')
                        .attr('id', 'dual-gradient')
                        .attr('y2', 1)
                        .attr('x2', 0);

        lin_grad.append('stop')
                    .attr('offset', 0)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 0);

        lin_grad.append('stop')
                    .attr('offset', 0.2)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 0.5);
        
        lin_grad.append('stop')
                    .attr('offset', 0.4)
                    .attr('stop-color', 'white')
                    .attr('stop-opacity', 1);

        lin_grad.append('stop')
                .attr('offset', 0.6)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 1);

        lin_grad.append('stop')
                .attr('offset', 0.8)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 0.5);

        lin_grad.append('stop')
                .attr('offset', 1)
                .attr('stop-color', 'white')
                .attr('stop-opacity', 0);

        mask = d3.select('defs')
                    .append('mask')
                    .attr('id', 'fade-both')
                    .attr('maskContentUnits', 'objectBoundingBox');

        mask.append('rect')
                .attr('width', 1)
                .attr('height', 1)
                .attr('fill', 'url(#dual-gradient)');
    },
    
    defineSawtoothClips: function(h, n){    
        /*
            h: height of sawtooth clip (range -> 0,1)
            n: number of sawtooths
        */

        var mask_bot = glyph_module_controller.makeSawtoothClipPath("bottom", h, n);
        d3.select('defs').append("svg:clipPath")
            .attr("id", "bottom_sawtooth")
            .attr("clipPathUnits", "objectBoundingBox")
            .append("path")
            .attr("d", mask_bot);

        mask_top = glyph_module_controller.makeSawtoothClipPath("top", h, n);
        d3.select('defs').append("svg:clipPath")
            .attr("id", "top_sawtooth")
            .attr("clipPathUnits", "objectBoundingBox")
            .append("path")
            .attr("d", mask_top);

    
        mask_mid = glyph_module_controller.makeSawtoothClipPath("middle", h, n);
        d3.select('defs').append("svg:clipPath")
            .attr("id", "dual_sawtooth")
            .attr("clipPathUnits", "objectBoundingBox")
            .append("path")
            .attr("d", mask_mid);
       
    },

    makeSawtoothClipPath: function(type, height_origin, number){
    // "M 1,1 1,0 0,0 0,1 0.05,0.85 0.10,1 0.15,0.85 0.20,1 0.25,0.85 0.30,1 0.35,0.85 0.40,1 0.45,0.85 0.50,1 0.55,0.85 0.60,1 0.65,0.85 0.70,1 0.75,0.85 0.80,1 0.85,0.85 0.90,1 0.95,0.85 1,1 "
        var path = "M"
        var step = (1/number)/2;
        var ptr = step;
        var origin = 0;
    
        if(type !== "middle"){
            if(type === "top"){
                path += " 1,0 1,1 0,1 0,0";
                origin = 0;
                height = height_origin;
            }
            else{
                height = 1 - height_origin;
                origin = 1;
                path += " 1,1 1,0 0,0 0,1";
            }
            
            while(ptr < 1){
                var line = ` ${ptr},${height}`
                path += line
                ptr += step
            
                line = ` ${ptr},${origin}`
                path += line
                ptr += step
            }
        }

        else{
            path += " 0,0"
            while(ptr < 1){
                var line = ` ${ptr},${height}`
                path += line
                ptr += step
            
                line = ` ${ptr},${origin}`
                path += line
                ptr += step
            }
            
            path += " 1,1"
            
            height = 1 - height_origin;
            origin = 1;
            ptr = 1;

            while(ptr >= 0){
                var line = ` ${ptr},${origin}`
                path += line
                ptr -= step
            
                line = ` ${ptr},${height}`
                path += line
                ptr -= step
            }
            
            path += " 0,0"
        }
    
        path += ""
    
        return path
    },

    init: function(draw_area){
        draw_area.append('defs')
        .append('mask')
        .attr('id', `${draw_area.attr('id')}-abstracting-mask`);

        return {
            draw_area: draw_area,
            line_defs: {
                up: [],
                down: []
            }, 
            glyph_models: [],
            constants: this.constants,
            abstraction_mask: [],
            design_glyph_model: {
                type :"ring",
                angle: 45,
                grouped: true,
                color: "blue",
                overflow: {
                    top: true,
                    bottom: true
                }
            },
            
            set_draw_area_dim: function(dims){
                if (dims.h) {
                    draw_area.attr('height', dims.h);
                }
                if (dims.w){
                    draw_area.attr('width', dims.w);
                }
            },
    
            //adapted from https://stackoverflow.com/questions/11394706/inverse-of-math-atan2
            get_y2_from_angle: function(x1,x2,y1,angle){
                theta = angle * Math.PI / 180;
                length = x2 - x1;
                dy = (length*.75 ) * Math.sin(theta);
        
                return dy+y1;
            },
        
            get_num_lines: function(h){
                var num_lines;
        
                //calculate offsets by first getting number of lines
                if(h < 4*this.constants.LINE_DENSITY_FACTOR){
                    num_lines = this.constants.MIN_NUMBER_LINES;
                    h = 4*this.constants.LINE_DENSITY_FACTOR;
                }
                else {
                    num_lines = h/this.constants.LINE_DENSITY_FACTOR;
                }
        
                return num_lines;
            },
        
            define_down_lines: function(num_lines, h, scales, glyph_model){
                var line_defs = [];
                //define mathematical offsets as data array for d3
                for(var i = 0; i < num_lines; i++){
                    var y2 = this.get_y2_from_angle(scales.x(0), scales.x(1), scales.y(i), glyph_model.angle);
                    // if (y2 < h){
                    line_defs.push({"x1":scales.x(0), "y1":scales.y(i), "x2":scales.x(1), "y2":y2, id:"h"+i});
                    // }
                }

                return line_defs;
            },
        
            define_up_lines: function(num_up_lines, down_lines, scales, glyph_model){
                up_lines = []
                dl_indx = down_lines.length - num_up_lines;
                for(var i = 0; i < num_up_lines; i++){
                    up_lines.push({"x1":scales.x(0),"y1":down_lines[dl_indx+i].y2,"x2":scales.x(1),"y2":scales.y(i), id:"v"+i, color:glyph_model.color});
                }
                return up_lines
            },
        
            flip_lines: function(lines){
                var flipped_lines = [];
                var id = 0;

                for(var line in lines){
                    flipped_lines.push({"x1":lines[line].x1,"y1":lines[line].y2,"x2":lines[line].x2,"y2":lines[line].y1, id:"h"+id, color:lines[line].color});
                    id ++;
                }
        
                return flipped_lines
            },
            
            clear_glyph_defs: function(){
                this.glyph_models = [];
            },
        
            /*
            MASK DEFINITIONS
            */
         
        
            add_opacity_layer: function(svg, height, width){
                opacity_layer = svg.append('rect')
                                        .attr('class', 'blur-opacity-layer')
                                        .attr('height', height)
                                        .attr('width', width)
                                        .attr('fill', `rgba(255,255,255,${this.constants.OPACITY})`);
            },
            
            define_clipping_mask: function(){
                var margin = 10;
        
                var path = `M${this.line_defs.down[0].x1}, ${this.line_defs.down[0].y1 - margin}
                            L${this.line_defs.down[0].x2}, ${this.line_defs.down[0].y1 - margin}
                            L${this.line_defs.down[0].x2}, ${this.line_defs.down[0].y2 - margin}
                            L${this.line_defs.down[0].x1}, ${this.line_defs.down[0].y1 - margin}
        
                            M${this.line_defs.down[this.line_defs.down.length - 1].x2}, ${this.line_defs.down[this.line_defs.down.length - 1].y2  + margin}
                            L${this.line_defs.down[this.line_defs.down.length - 1].x1}, ${this.line_defs.down[this.line_defs.down.length - 1].y2  + margin}
                            L${this.line_defs.down[this.line_defs.down.length - 1].x1}, ${this.line_defs.down[this.line_defs.down.length - 1].y1  + margin}
                            L${this.line_defs.down[this.line_defs.down.length - 1].x2}, ${this.line_defs.down[this.line_defs.down.length - 1].y2  + margin}
                            Z`;
                
                this.abstraction_mask = [path]
            },
        
        
            //get the defintions of the lines as lists of x,y coords
            set_line_defs: function(glyph_model){
                var vert_lines = [];
                var horz_lines = [];
                var num_horz_lines = this.get_num_lines(glyph_model["height"]);
                var scales = {
                    'x':d3.scaleLinear().domain([0,1]).range([0, glyph_model["width"]]),
                    'lines': d3.scaleQuantize().domain([15,60]).range([1,2,3,4])
                }
                if (glyph_model.grouped == true){
                    scales['lines'] = d3.scaleQuantize().domain([15,60]).range([1,2])
                }

                var num_lines = scales['lines'](glyph_model.angle);
                scales['y'] = d3.scaleLinear().domain([0,num_horz_lines+num_lines]).range([0, glyph_model["height"]]);
        
                // get the line definitions for the downward sloping, left to right horizontal lines
                horz_lines = this.define_down_lines(num_horz_lines, glyph_model["height"], scales, glyph_model);
        
                // get the vertical lines for a ring sloping up from left to right
                if(glyph_model.type == 'ring'){
                    vert_lines = this.define_up_lines(num_lines, horz_lines, scales, glyph_model);
                }
                // do a seperate calculation for exchanges
                else if (glyph_model.type == 'exchange') {
                    // exchanges use a different number of lines by default
                    scales['lines'].range([2,3,4,5]);
                    num_lines = scales['lines'](glyph_model.angle);
        
                    // vertical and horizontal lines are equal number
                    scales['y'].domain([0, num_lines*2]);
        
                    // need to define horizontal lines first before flipping to make the vertical lines look correct
                    horz_lines = this.define_down_lines(num_lines, glyph_model["height"], scales, glyph_model);
                    vert_lines = this.define_up_lines(num_lines, horz_lines, scales, glyph_model);

                    horz_lines = this.flip_lines(vert_lines);
                }

                this.line_defs.up = vert_lines;
                this.line_defs.down = horz_lines;
            },
        
        
            /**************************************
             **** Primitive rendering defintions ***
            ***************************************/
            
        
            // main primitive rendering function call
            render_primitives: function(){
                //scales
                var num_glyphs = this.glyph_models.length;
                if(num_glyphs > 0){
                    var svg_height = parseInt(this.draw_area.attr('height'))
                    var x_scale = d3.scaleLinear().domain([0,1]).range([0 + this.constants.MARGIN.left, this.glyph_models[0]['width'] - this.constants.MARGIN.right]);
                    var y_scale = d3.scaleLinear().domain([0,num_glyphs]).range([10, svg_height]);
                    
                    //set line defintions and define clipping mask
                    this.set_line_defs(this.glyph_models[0]);
                    this.define_clipping_mask(this.line_defs.down);
                    var draw_height = this.line_defs.down[this.line_defs.down.length - 1].y2;
                    // var draw_height = 0;
                }
                var primitive_groups = this.draw_area.selectAll('.glyph-area')  
                                            .data(this.glyph_models, (d)=>{return d.id});
                
                mask = this.draw_area.select('defs')
                    .select('mask')
                    .selectAll('.mask-path')
                    .data(this.abstraction_mask);


                /*
                 *    ENTERS
                 */
                pg_enter = primitive_groups.enter()
                    .append('g')
                    .attr('class', 'glyph-area')
                    .attr('height', (d) => {return d['height'];})
                    .attr('width', (d) => {return d['width']})
                    .attr('mask', (d, id) => {
                        if(this.glyph_models.length == 1 && d.overflow.top && d.overflow.bottom){
                            return 'url(#fade-both)'
                        }
                        else if(id == 0 && d.overflow.top){
                            return 'url(#fade-up)'
                        }
                        else if(id == this.glyph_models.length-1 && d.overflow.bottom){
                            return 'url(#fade-down)'
                        }
                    })
                    .attr('transform', (d) => {
                        return `translate(${0}, ${draw_height*d['id'] + this.constants.PADDING * d['id']})`;
                    });
                pg_enter.append('g')
                    .attr('class', 'down-lines-group')
                    .attr('height', (d) => {return d['height']})
                    .attr('width', (d) => {return d['width']});
                pg_enter.append('g')
                    .attr('class', 'up-lines-group')
                    .attr('height', (d) => {return d['height']})
                    .attr('width', (d) => {return d['width']});
                         
                //when new path comes in
                mask.enter()
                    .append('path')
                    .attr('class','mask-path')
                    .attr('d', (d)=>{return d})
                    .attr('fill', 'white');
            

                // enter for up and down lines
                dlines = this.draw_area.selectAll('.down-lines-group')
                            .selectAll('.down-lines')
                            .data(this.line_defs.down, d=>{return d.id});
                
                ulines = this.draw_area.selectAll('.up-lines-group')
                            .selectAll('.up-lines')
                            .data(this.line_defs.up, d=>{return d.id});
                
                dlines.enter()
                        .append('line')
                        .attr('class', 'down-lines')
                        .attr('stroke', 'black')
                        .attr('stroke-width', this.constants.SW)
                        .attr('x1', (d)=>{return d['x1']})
                        .attr('y1', (d)=>{return d['y1']})
                        .attr('x2', (d)=>{return d['x2']})
                        .attr('y2', (d)=>{return d['y2']});

                
                ulines.enter()
                        .append('line')
                        .attr('class', 'up-lines')
                        .attr('stroke', 'black')
                        .attr('stroke-width', this.constants.SW)
                        .attr('x1', (d)=>{return d['x1']})
                        .attr('y1', (d)=>{return d['y1']})
                        .attr('x2', (d)=>{return d['x2']})
                        .attr('y2', (d)=>{return d['y2']});

                
                /*
                *   UPDATES
                */
                
                //update mask
                mask.attr('d', (d)=>{return d;});

                // update groups of lines
                primitive_groups.attr('height', (d) => {return d['height']})
                    .attr('width', (d) => {return d['width']})
                    .attr('mask', (d, id) => {
                        if(this.glyph_models.length == 1 && d.overflow.top && d.overflow.bottom){
                            return 'url(#fade-both)'
                        }
                        else if(id == 0 && d.overflow.top == true){
                            return 'url(#fade-up)'
                        }
                        else if(id == this.glyph_models.length-1 && d.overflow.bottom == true){
                            return 'url(#fade-down)'
                        }
                    })
                    .attr('transform', (d) => {
                        return `translate(${0}, ${draw_height*d['id'] + (this.constants.PADDING * d['id'])})`;
                    });
                
                //update lines themselves
                dlines.attr('x1', (d)=>{return d['x1']})
                .attr('y1', (d)=>{return d['y1']})
                .attr('x2', (d)=>{return d['x2']})
                .attr('y2', (d)=>{return d['y2']});

                ulines.attr('x1', (d)=>{return d['x1']})
                .attr('y1', (d)=>{return d['y1']})
                .attr('x2', (d)=>{return d['x2']})
                .attr('y2', (d)=>{return d['y2']});


                //exit
                primitive_groups.exit().remove();
                dlines.exit().remove();      
                ulines.exit().remove(); 
                

                this.draw_area.selectAll('.up-lines-group')
                    .attr('mask', `url(#${this.draw_area.attr('id')}-abstracting-mask)`)


                //scale and center draw area
                var h_t = this.draw_area.attr('height');
                var h = this.draw_area.node().getBBox().height;
                var w_t = this.draw_area.attr('width');
                var w = this.draw_area.node().getBBox().width;

                if (num_glyphs > 1){
                    var s_factor = (h_t-20)/h
                }
                else {
                    var s_factor = (w_t*0.6)/w
                }

                var scaled_height = h*s_factor
                var scaled_width = w*s_factor
                if(this.glyph_models.length > 0){
                    if(this.glyph_models[0].mirror){    
                        this.draw_area
                            .attr('transform',`
                                translate(${(w_t*0.5 + scaled_width*0.5)}, ${(h_t*0.5 - scaled_height*0.5)})
                                scale(${-s_factor}, ${s_factor})
                            `);
                    }
                    else{
                        this.draw_area
                            .attr('transform',`
                                translate(${(w_t*0.5 - scaled_width*0.5)}, ${(h_t*0.5 - scaled_height*0.5)})
                                scale(${s_factor})
                            `);
                    }
                }


                // //flip if mirrored
                // if(this.glyph_models.length > 0 && this.glyph_models[0].mirror){
                // }
            },

            set_individual_glyph_defs: function(design_glyph_model, def_h, def_w){
                var models = [];
                var colors = ["black", "blue"];

                if(design_glyph_model.grouped == true){
                    //divide height by some constant
                    // 5 times the line density factor (which is in pixels)
                    var g_h = 4 * this.constants.LINE_DENSITY_FACTOR;
                    var num_glyphs = Math.round(def_h / (g_h)) + 1;

                    for(var i = 0; i < num_glyphs; i++){
                        var temp = {};
                        Object.assign(temp, design_glyph_model);
                        temp['height'] = g_h;
                        temp['width'] = def_w;
                        temp['color'] = colors[i%2];
                        temp['id'] = i;
                        models.push(temp);
                    }
                }
                // non-grouped
                else {
                    var temp = {};
                    var num_glyphs = 1;
                    Object.assign(temp, design_glyph_model);
        
                    if(design_glyph_model.type != "exchange"){
                        temp['height'] = def_h + 50;
                    }
                    else {
                        temp['height'] = def_h*.5;
                    }
                    temp['width'] = def_w;
                    temp['color'] = colors[0];
                    temp['id'] = 0;
                    models.push(temp);
                }
        
                this.glyph_models = models;
            }
        }
    }
}

// this is our setup area
// will be pushed to a function soon
var setup = function(){
    var element = d3.select(".draw-area");
    var def_h = element.node().offsetHeight - 50;
    var def_w = element.node().offsetWidth;

    var svg = element.append('svg')
                        .attr('id', 'svg-base')
                        .attr('height', def_h)
                        .attr('width', def_w);

    svg.append('defs');

    glyph_modules.define_blur();

    glyph_modules.add_opacity_layer(svg, def_h, def_w);

    render_primitives(svg, models, num_glyphs);
};
