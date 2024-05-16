glass_style = 3

var study = {
    questions: [],

    margin: {
        top: 20,
        right: 20,
        bottom: 10,
        left: 20
    },

    stubs: [{}, {}, {}, {}, {}],
    qstub: 0

};

// Obtained from here: https://stackoverflow.com/questions/4550505/getting-a-random-value-from-a-javascript-array
sample = function(arr){
    return arr[Math.floor(Math.random()*arr.length)];
  }


/*******************************
        Initialization
********************************/
d3.json("static/test_questions.json", function (json) {
    console.log(json);
    init_study();
    study.init(json);
});

var init_study = function () {
    study.bindButtons();

    study.calc_window_sizes();

    study.step_x_scale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, study.gantt_width]);

    study.ext = d3.extent(1);
    study.show_ext = [0, 1];

    study.step_y_scale = d3.scaleLinear()
        .domain([study.show_ext[0], study.show_ext[1]])
        .range([0, study.full_height]);

    study.stubs[0].svg = d3.select('#grid-q-div')
        .append('svg:svg')
        .attr('id', 'stub0')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'step');
    study.stubs[1].svg = d3.select('#grid-a-div')
        .append('svg:svg')
        .attr('id', 'stuba')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'step');

    clip_names = ["clip-q", "clip-a"];
    for (var i = 0; i < 2; i++) {
        study.stubs[i].clip_name = clip_names[i];
        study.stubs[i].g = study.stubs[i].svg.append('g');
        study.stubs[i].clip_path = study.stubs[i].g.append('defs').append("svg:clipPath")
            .attr("id", clip_names[i])
            .append("rect")
            .attr('width', study.gantt_width)
            .attr('height', study.full_height);
        study.stubs[i].g
                .attr("clip-path", "url(#" + clip_names[i] + ")");

        study.stubs[i].step_event_layer = study.stubs[i].g.append('g');
        study.stubs[i].step_message_layer = study.stubs[i].g.append('g');
    }

    //setup glyph module clips
    glyph_module_controller.define_blur();
    glyph_module_controller.define_top_gradient_mask();
    glyph_module_controller.define_bottom_gradient_mask();
    glyph_module_controller.define_dual_gradient_mask();
    glyph_module_controller.defineSawtoothClips(.1, 4);

    d3.select('#stub0')
        .append('rect')
        .attr('class', 'frosted-glass')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'rgba(255,255,255, 0)');

    d3.select('#stuba')
        .append('rect')
        .attr('class', 'frosted-glass')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'rgba(255,255,255, 0)');

    d3.select("#stub0")
        .append('g')
        .attr('id', 'q_glyphs');
    d3.select("#stuba")
        .append('g')
        .attr('id', 'c_glyphs');

    question_clip = d3.select("#clip-q")
                .select('rect');
    comp_clip = d3.select("#clip-a")
            .select('rect');

    q_h = parseInt(question_clip.attr('height'));
    q_w = parseInt(question_clip.attr('width'));
    c_h = parseInt(comp_clip.attr('height'));
    c_w = parseInt(comp_clip.attr('width'));

    q_glyph_area = d3.select('#q_glyphs')
                        .attr('height', q_h)
                        .attr('width', q_w);
    
    c_glyph_area = d3.select('#c_glyphs')
                        .attr('height', c_h)
                        .attr('width', c_w);

    // create two glyph module controllers
    study.q_gmc = glyph_module_controller.init(q_glyph_area)
    study.c_gmc = glyph_module_controller.init(c_glyph_area)

};  // study vars

//these functions were not binding for some reason so I put them in a
// function called from init
study.bindButtons = function (){

    //hides notification band when users
    // acknowedge the differences between
    // tutorial and main test
    $('#acknowledge-button').click(function(){
        $('#notification-band')
        .attr('class', 'hidden');
        $('.confirm')
        .removeAttr('disabled');
    })

    //conditional next button for tutorial
    $('#tut-next').click(function(){
        if(study.tutorial_no != study.tutorial.length-1){
            study.update();

            $('.answer-verify')
                .attr("class", 'answer-verify hidden');
            $('#tut-verify-content')
                .attr("class", 'hidden');
            $('#tut-next')
                .attr("class", 'hidden');
            $('.confirm')
                .removeAttr('disabled');
            $('.hint-text')
                .remove();
        }
        else{
            
            // upload next state
            // there need to happen after multi
            // if(study.tutorial_phase == "patterns"){
            //     study.tutorial_phase = "stride"
            // }
            // else if(study.tutorial_phase == "stride"){
            //     study.tutorial_phase = "end_of_tutorial"
            // }

            // localStorage.setItem("state", study.tutorial_phase)
            localStorage.setItem("eot", true)


            window.location.href = `/tutorial?filename=${study.session}`;    
        }

    });


    $('.confirm').click(function(){
        study.session = document.getElementById("myfile").value;

        if (study.showing_tutorial) {
            question = study.tutorial[study.tutorial_no]
            is_correct = study.isAnswerCorrect(this.value, question)


            $.ajax({
                url: '/recordResponse',
                data: {
                    "session": study.session,
                    "state": "tutorial",

                    "question_type": question.question_type,
                    "response": this.value,
                    "answer": question.choices[0].correct,
                    "response_correct": is_correct,
                    
                    "question_num": study.tutorial_no,
                    "question": question.question_id,
                    "start": study.question_start,
                    "finish": Date.now()
                },
                type: 'POST',
                success: function (response) {
                    console.log(response);
                },
                error: function (error) {
                    console.warn(error.responseText);
                    console.log("Please begin the test from the /demographics page.");
                }
            });

            
            $('.answer-verify')
                .attr("class", 'answer-verify visible');
            $('#tut-verify-content')
                .attr("class", 'tut-verify-content visible')

            if(is_correct){
                $('.answer-verify')
                .css('border-top', '5px solid rgb(20,150,20)')
                .css('border-bottom','5px solid rgb(20,150,20)');

                $('#tut-verify-content')
                .append(`<p class='hint-text'>${sample(["Good job!", "That's correct!", "Perfect!", "You're doing great!"])}</p>`);
                // .css('line-height', $('#tut-verify-content').height()+"px"); //center align text
            }
            else {
                var hint = sample(["So close, but just a small mistake. ", "That's not quite right. ", "Nice try, but that's not quite it."]);
                $('#tut-verify-content')
                    .append(`<p class='hint-text' id='flavor-text'>${hint}</p>`);
                  

                $('#tut-verify-content')
                    .append(`<p class='hint-text'>${question['hint']}</p>`);

                $('.answer-verify')
                    .css('border-top', '5px solid rgb(150,20,20)')
                    .css('border-bottom','5px solid rgb(150,20,20)');
                  
            }

            //set tutorial continue button to visible
            $('.confirm')
                .attr('disabled', 'disabled');
            $('#tut-next')
                .attr('class', 'visible button');
        } 

        else {
            console.log(study.question_no)
            question = study.questions[study.question_order[study.question_no]]
            is_correct = study.isAnswerCorrect(this.value, question)

            console.log(question.question_id)
            

            $.ajax({
                url: '/recordResponse',
                data: {
                    "session": study.session,
                    "state": "questions",

                    "question_type":question.question_type,
                    "response": this.value,
                    "answer": question.choices[0].correct,
                    "response_correct": is_correct,

                    "question_num": study.question_order[study.question_no],
                    "question": question.question_id,
                    "start": study.question_start,
                    "finish": Date.now()
                },
                type: 'POST',
                success: function (response) {
                    console.log(response);
                },
                error: function (error) {
                    console.warn(error.responseText);
                    console.log("Please begin the test from the /demographics page.");
                }
            });

            
            study.update();
        }
    });

}

study.isAnswerCorrect = function(selection, question){
    // console.log(selection, question.choices[0].correct)
    if(question.choices[0].correct.toLowerCase() == selection.toLowerCase()){
        return true;
    }
    return false;
}

study.get_glyph_model = function(question){
    var glyph_model = {};

    glyph_model.type = question.pattern;
    
    if(question.pattern == 'exchange'){
        glyph_model.grouped = true;
    }
    else if(question.other_characteristics.pattern == "continuous"){
        glyph_model.grouped = false;
    }
    else {
        glyph_model.grouped = true;
    }

    if(question.representation != 'full'){
        glyph_model.overflow = {
            top: true,
            bottom: true
        };  

        switch(question.other_characteristics.partial_loc){
            case 'top':
                glyph_model.overflow.top = false;
                break;
            case 'bottom':
                glyph_model.overflow.bottom = false;
                break;
            case 'middle':
                break;
        }
    }
    else{
        glyph_model.overflow = {
            top: false,
            bottom: false
        }
    }

    offset_to_angle = d3.scaleQuantize().domain([0,6]).range([15,30,45,60]);
    glyph_model.angle = offset_to_angle(question.offset);

    if(typeof(question.other_characteristics) != "undefined"){
        if(typeof(question.other_characteristics.mirror) != "undefined"){
            glyph_model.mirror = question.other_characteristics.mirror;
        }
        else{
            glyph_model.mirror = 0;
        }
    } else {
        glyph_model.mirror = 0;
    }

    return glyph_model;
};


study.fetchCorrectSawtoothClip = function(question){
    if(question['representation'] === "partial"){
        if(question['other_characteristics']['partial_loc'] === "top"){
            return "url(#bottom_sawtooth)";
        }
        if(question['other_characteristics']['partial_loc'] === "bottom"){
            return "url(#top_sawtooth)";
        }
        if(question['other_characteristics']['partial_loc'] === "middle"){
            return "url(#dual_sawtooth)";
        }
    }
    return '';
};


/***********************************
            End Processing
************************************/
var end_questions = function () {
    $.ajax({
        url: '/end',
        data: {
            "session": study.session,
            "finish": Date.now()
        },
        type: 'POST',
        success: function (response) {
            console.log(response);
            window.location.href = '/comments/' + study.session;
        },
        error: function (error) {
            console.log(error);
        }
    });
}

// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
shuffle = function (array) {
    // var currentIndex = array.length, temporaryValue, randomIndex;

    // // While there remain elements to shuffle...
    // while (0 !== currentIndex) {

    //     // Pick a remaining element...
    //     randomIndex = Math.floor(Math.random() * currentIndex);
    //     currentIndex -= 1;

    //     // And swap it with the current element.
    //     temporaryValue = array[currentIndex];
    //     array[currentIndex] = array[randomIndex];
    //     array[randomIndex] = temporaryValue;
    // }

    return array;
}

study.calc_window_sizes = function () {
    study.width = d3.select('.answer-draw-area').node().offsetWidth - 5;
    study.check_height = d3.select('#check-a-div').node().offsetHeight;
    study.gantt_width = study.width - study.margin.left - study.margin.right;
    study.full_height = d3.select('.answer-draw-area').node().offsetHeight - 50;

};

study.resize = function () {
    study.step_y_scale
        .range([0, study.full_height]);
}

window.onresize = function (event) {
    study.calc_window_sizes();
    study.resize();
}

//returns a list of scales representing a tuple
 // 0 is question
 // 1 is comparator
study.construct_y_scales = function(question) {
  var y_scales = [];
  var q = {};
  var a = {};

  q.rows = question.question_sample.grid_size[0];
  y_scales.push(
    d3.scaleLinear()
      .domain([0, q.rows + 1])
      .range([0, study.full_height])
    );

  if(question.question_type == "direct comparison"){  
    a.rows = question.choices[0].grid_size[0];
    y_scales.push(d3.scaleLinear()
        .domain([0, a.rows + 1])
        .range([0, study.full_height]));
  }

  return y_scales;
}


/**********************
 *  Draw Questions    *
 **********************/

study.show_question = function (question) {
    d3.select('#debug-id').text(question.debug_id + "");
    console.log("Question id: ", question.question_id);

    //hide everything first
    d3.select('#multi-choice-pattern').attr('class', 'category hidden');
    d3.select('#multi-choice-grouping').attr('class', 'category hidden');
    d3.select('#grid-a-div').attr('class', 'grid hidden');
    d3.select('#check-a-div').attr('class', 'checkdiv hidden');

    study.cols = question.question_sample.grid_size[1];
    study.rows = question.question_sample.grid_size[0];

    if(question.question_type == "direct comparision"){
        for (var i = 0; i < question.choices.length; i++) {
            study.cols = d3.max([study.cols, question.choices[i].grid_size[1]]);
            study.rows = d3.max([study.rows, question.choices[i].grid_size[0]]);
        }
    }

    study.current_step_span = study.cols;

    study.y_scales = study.construct_y_scales(question);

    if (study.cols > 12) {
        study.step_x_scale.domain([0, study.cols + 1]);
    } else {
        study.step_x_scale.domain([0, 2]);
    }
    

    //abstraction layer flags
    study.q_abstract = question.abstract;
    study.c_abstract = false;

    if(question.question_type == "direct comparison")
        study.c_abstract = question.choices[0].abstract;


    // render the question paragraph then the question grid
    $('#q-para').html(question.question_text);
    if(study.q_abstract == true){
        question.question_sample.messages = [];
    }
    study.draw_grid(question.question_sample, study.stubs[0], study.y_scales[0], question);
    
    // note if an answer has been selected and render question grid
    // This has a lot of conditional rendering now, based off abstraction and question type
    
    $('#check-a').attr('checked', false);
    if(study.c_abstract == true){
        question.choices[0].messages = [];
    }

    // question type conditional rendering
    // so much hardcoding D; IM AN AWFUL PROGRAMMER
    if(question.question_type == "direct comparison"){
        d3.select('#grid-a-div').attr('class', 'grid');
        d3.select('#check-a-div').attr('class', 'checkdiv')

        study.draw_grid(question.choices[0], study.stubs[1], study.y_scales[1], question.choices[0]);
    }
    else if (question.question_type == "categorization"){
        if(question.choices[0].type == "grouping"){
            d3.select('#multi-choice-grouping').attr('class', 'category');
        }
        else if(question.choices[0].type == "pattern"){
            d3.select('#multi-choice-pattern').attr('class', 'category');
        }
    }

    study.stubs[0].step_event_layer.attr('clip-path', study.fetchCorrectSawtoothClip(question))
    // study.stubs[0].step_message_layer.attr('clip-path', study.fetchCorrectSawtoothClip(question))
    study.stubs[1].step_event_layer.attr('clip-path', study.fetchCorrectSawtoothClip(question.choices[0]))
    // study.stubs[1].step_message_layer.attr('clip-path', study.fetchCorrectSawtoothClip(question.choices[0]))

    if(study.q_abstract == true){
        d3.select("#stub0")
            .select('.frosted-glass')
            .attr('fill', 'rgba(255,255,255, .5)');
        study.stubs[0].step_event_layer
            .attr('filter', 'url(#blur-def)');    
        
        question_clip = d3.select("#clip-q")
            .select('rect');
        
        q_h = parseInt(question_clip.attr('height'));
        q_w = parseInt(question_clip.attr('width'));

        q_gm = study.get_glyph_model(question);

        this.q_gmc.set_draw_area_dim({'h':q_h,'w':q_w});
        this.q_gmc.set_individual_glyph_defs(q_gm, q_h, q_w);  
        
    }
    //no abstraction for lhs
    else{
        d3.select("#stub0")
            .select('.frosted-glass')
            .attr('fill', 'rgba(255,255,255, 0)');
        study.stubs[0].step_event_layer
            .attr('filter', '');
        this.q_gmc.clear_glyph_defs();
    }

    if(study.c_abstract == true){
        d3.select("#stuba")
            .select('.frosted-glass')
            .attr('fill', 'rgba(255,255,255, .5)');
        study.stubs[1].step_event_layer
            .attr('filter', 'url(#blur-def)');
        
        comp_clip = d3.select("#clip-a")
            .select('rect');

        c_h = parseInt(comp_clip.attr('height'));
        c_w = parseInt(comp_clip.attr('width'));
        
        c_gm = study.get_glyph_model(question.choices[0]);

        this.c_gmc.set_draw_area_dim({'h':c_h,'w':c_w});
        this.c_gmc.set_individual_glyph_defs(c_gm,c_h,c_w);
    }

    //no abstraction for rhs
    else{
        d3.select("#stuba")
            .select('.frosted-glass')
            .attr('fill', 'rgba(255,255,255, 0)');
        study.stubs[1].step_event_layer
            .attr('filter', '');
        this.c_gmc.clear_glyph_defs();
    }

    this.q_gmc.render_primitives(); 
    this.c_gmc.render_primitives();
    
    //store the question type in a global variable for use in confirming inputs
    study.question_type = question.question_type;

};

study.init = function (json) {
    //just store it in the browser
    study.tutorial_phase = localStorage.getItem("state");

    if (study.tutorial_phase == "context"){
        study.tutorial_phase = "patterns";
    }

    console.log(json, json.tutorial, study.tutorial_phase);


    study.tutorial = json.tutorial[study.tutorial_phase];
    study.tutorial_no = 0;
    study.showing_tutorial = tutorial_active;

    study.questions = json.questions[study.tutorial_phase];
    study.question_no = 0;
    study.question_start = Date.now();

    var num_questions = study.questions.length;
    var unshuffled = [...Array(num_questions).keys()];
    study.question_order = shuffle(unshuffled);
    if(study.showing_tutorial){
        study.show_question(study.tutorial[study.tutorial_no]);
    }
    else{
        $('.answer-verify').attr("class", 'answer-verify hidden');
        study.show_question(study.questions[study.question_order[study.question_no]]);
    }
};

study.update = function () {
    study.question_start = Date.now();

    if (study.showing_tutorial) {
        if (study.tutorial_no + 1 >= study.tutorial.length) {
            study.showing_tutorial = false;   
        } else {
            study.tutorial_no++;
            study.show_question(study.tutorial[study.tutorial_no]);

            // update progress bar
            $('#meter').css('width', `${((study.tutorial_no+1)/study.tutorial.length)*100}%`);
        }
    } else {
        study.question_no++;
        console.log("post update q#: ", study.question_no);
        if (study.question_no < study.questions.length) {
            study.show_question(study.questions[study.question_order[study.question_no]]);

            // update progress bar
            $('#meter').css('width', `${((study.question_no+1)/study.questions.length)*100}%`);
        } 
        else if(study.tutorial_phase == "patterns"){
            study.tutorial_phase = "stride";

            localStorage.setItem("state", study.tutorial_phase);
            localStorage.setItem("eot", false);

            window.location.href = `/tutorial?filename=${study.session}`;    
        }
        else {
            end_questions();
        }
    }
};

study.create_grid = function (question_grid) {
    grid_items = [];
    var cell_id = 0;
    for (var i = 0; i < question_grid.grid_size[0]; i++) {
        for (var j = 0; j < question_grid.grid_size[1]; j++) {
            grid_items.push(
                {
                    "cell_id": cell_id,
                    "row": i,
                    "col": j,
                    "selected": true
                }
            );
            cell_id++;
        }
    }
    for (var i = 0; i < question_grid.off_cells.length; i++) {
        var unselected = question_grid.off_cells[i];
        //catch partial generation keeping off cells defined
        if(!(typeof grid_items[unselected] === 'undefined')){
          grid_items[unselected].selected = false;
        }
    }
    return grid_items;
}

study.draw_grid = function (grid, stub, y_scale, full_draw_def) {
    var rects, msgs, circles
    minExtent = study.step_x_scale.domain()[0],
        maxExtent = study.step_x_scale.domain()[1],
        minEntity = y_scale.domain()[0] - 1,
        maxEntity = y_scale.domain()[1];

    var barHeight = y_scale(2.0) - y_scale(1.0) - 6; //I do not know what y_scale 1, 2 and 6 mean
    var barWidth = study.step_x_scale(2.0) - study.step_x_scale(1.0) - 6;
    var barXoffset = 3;
    var barYoffset = 3;
    var strokeWidth = 1;
    var grid_items = study.create_grid(grid);
    var dense = false;


    //enforce aspect ratio constraint
    // done with scales to simplify successive calulations
    while (barHeight > (barWidth*0.30)){
      var compression = (barHeight * (grid_items.length/2));
      y_scale.range([0, compression]);
      barHeight = y_scale(2.0) - y_scale(1.0) - 6;
    }

    //dense drawing changed to a bar height heuristic
    // less than 12 px means that otlines are removed and
    // spacing is removed
    if(barHeight < 12){
      barYoffset = 0;
      dense = true;
      barHeight = y_scale(2.0) - y_scale(1.0);
    }


    if (barWidth <= 5) {
        barWidth += 4;
        strokeWidth = 0;
        barXoffset = 0;
    }
    if (barHeight <= 5) {
        barHeight += 4;
        barYoffset = 0;
    }

    stub.clip_path
        .attr('height', y_scale(grid.grid_size[0]))

    rects = stub.step_event_layer.selectAll('.event')
        .data(grid_items, d => { return d.cell_id; })
        .attr('x', d => { return study.step_x_scale(d.col) + barXoffset; })
        .attr('y', d => { return y_scale(d.row) + barYoffset; })
        .attr('height', barHeight)
        .attr('width', barWidth)
        .style('stroke-width', d => {
            if(dense === true){ //stoke width is 0 if chart is dense
              return 0;
            } else {
              return d.selected ? 2 : 1;
            }
        })
        .attr('class', d => { return d.selected ? "selected event" : "ghost event" });

    rects.enter().append('rect')
        .attr('x', d => { return study.step_x_scale(d.col) + barXoffset; })
        .attr('y', d => { return y_scale(d.row) + barYoffset; })
        .attr('height', barHeight)
        .attr('width', barWidth)
        .style('stroke-width', d => {
          if(dense === true){ //stroke width is 0 if chart is dense
            return 0;
          } else {
            return d.selected ? 2 : 1;
          }
        })
        .attr('class', d => { return d.selected ? "selected event" : "ghost event" })
        .append('svg:title')
        .text(d => { return "[" + d.row + "," + d.col + "]"; });

    rects.exit().remove();

    var id_to_row = function (myid) {
        return Math.floor(myid / grid.grid_size[1]);
    };
    var id_to_col = function (myid) {
        return ((myid % grid.grid_size[1]) + grid.grid_size[1]) % grid.grid_size[1];
    }

    // Comms
    msgs = stub.step_message_layer.selectAll('.message')
        .data(grid.messages, d => { return d[0] + '-' + d[1]; })
        .attr('x1', d => { return study.step_x_scale(id_to_col(d[0]) + 0.5); })
        .attr('x2', d => { return study.step_x_scale(id_to_col(d[1]) + 0.5); })
        .attr('y1', d => { return y_scale(id_to_row(d[0]) + 0.5); })
        .attr('y2', d => { return y_scale(id_to_row(d[1]) + 0.5); });

    msgs.enter().append('line')
        .attr('class', 'study message')
        .attr('x1', d => { return study.step_x_scale(id_to_col(d[0]) + 0.5); })
        .attr('x2', d => { return study.step_x_scale(id_to_col(d[1]) + 0.5); })
        .attr('y1', d => { return y_scale(id_to_row(d[0]) + 0.5); })
        .attr('y2', d => { return y_scale(id_to_row(d[1]) + 0.5); });

    msgs.exit().remove();

};
