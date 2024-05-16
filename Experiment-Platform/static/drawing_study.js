var study = {
    questions: [],

    margin: {
        top: 20,
        right: 20,
        bottom: 10,
        left: 20
    },

    stubs: [{}, {}, {}, {}, {}],
    qstub: 0,
    empty_draw_grid:{
      messages: [],
      grid_size:[12, 2],
      off_cells:[],
      draw_grid_flag: true
    }


};

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


//these functions were not binding for some reason so I put them in a
// function called from init
study.bindButtons = function (){

    //hides notification band when users
    // acknowedge the differences between
    // tutorial and
    $('#acknowledge-button').click(function(){
        $('#notification-band')
        .attr('class', 'hidden');
        $('.confirm')
        .removeAttr('disabled');
    })

    //conditional next button for tutorial
    $('#tut-next').click(function(){
      if(study.tutorial_no === study.tutorial.length-1){
          $('#notification-band').attr('class', 'visible');

          //to prevent rolling over into repeats for this thing
          $('#tut-next').attr('class', 'hidden');
      }

      study.update();
      $('#tut-verify-content')
      .attr("class", 'hidden');
      // $('#tut-next')
      // .attr("class", 'hidden');
      $('.confirm')
      .removeAttr('disabled');

    });


    $('.confirm').click(function(){

        //made single variable so you dont have to check wich is no and yes
        checkbox = (this.value === 'Yes') ? true : false;

        study.session = document.getElementById("myfile").value;
        if (study.showing_tutorial) {
            $.ajax({
                url: '/recordMulti',
                data: {
                    "session": study.session,
                    "state": "tutorial",
                    "boxes": [
                        checkbox
                    ],
                    "question_num": study.tutorial_no,
                    "answer_order": study.answer_order,
                    "question": study.tutorial_no,
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
        } else {
            $.ajax({
                url: '/recordMulti',
                data: {
                    "session": study.session,
                    "state": "multi",
                    "boxes": [
                        checkbox
                    ],
                    "question_num": study.question_order[study.question_no],
                    "answer_order": study.answer_order,
                    "question": study.questions[study.question_order[study.question_no]].question_id,
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
        }

        if(study.showing_tutorial){
          correctChoice = study.tutorial[study.tutorial_no].choices[0].correct;

          if( (checkbox === true && correctChoice === "yes") ||
              (checkbox === false && correctChoice === "no")){
              $('#tut-verify-content')
              .text("Correct!")
              .attr("class", 'correct')
              .css('line-height', $('#tut-verify-content').height()+"px");
          }

          else {
              $('#tut-verify-content')
              .text("Incorrect!")
              .attr("class", 'incorrect')
              .css('line-height', $('#tut-verify-content').height()+"px");

              // buildReasonTxt(study.tutorial[study.tutorial_no].choices[0],  )
              //
              // $('#tut-verify-content')
              // .append(`<p>${reason_text}</p>`)
          }

          //set tutorial continue button to visible
          $('.confirm')
          .attr('disabled', 'disabled');
          $('#tut-next')
          .attr('class', 'visible button');

        }
        // we only go immediately to the next question if we are not in a
        // tutorial phase
        // we will have to notify subjects of this interface change
        else {
            study.update();
        }
    });

}


// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
shuffle = function (array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


d3.json("static/test_questions.json", function (json) {
    init_study();
    study.init(json);
});

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

var init_study = function () {
    document.getElementById("error-message").style.display = "none";
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
    study.stubs[2].svg = d3.select('#grid-b-div')
        .append('svg:svg')
        .attr('id', 'stubb')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'step');
    study.stubs[3].svg = d3.select('#grid-c-div')
        .append('svg:svg')
        .attr('id', 'stubc')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'step');
    study.stubs[4].svg = d3.select('#grid-d-div')
        .append('svg:svg')
        .attr('id', 'stubd')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('class', 'step');

    clip_names = ["clip-q", "clip-a", "clip-b", "clip-c", "clip-d"];
    for (var i = 0; i < 5; i++) {
        study.stubs[i].clip_name = clip_names[i];
        study.stubs[i].g = study.stubs[i].svg.append('g');
        study.stubs[i].defs = study.stubs[i].g.append('defs');
        study.stubs[i].clip_path = study.stubs[i].defs.append("svg:clipPath")
            .attr("id", clip_names[i])
            .append("rect")
            .attr('width', study.gantt_width)
            .attr('height', study.full_height);
        study.stubs[i].g.attr("clip-path", "url(#" + clip_names[i] + ")");


        // add top and bottom clip paths
        var h = .35;
        var n = 8;

        var mask = study.makeSawtoothClipPath("bottom", h, n);
        study.stubs[i].defs.append("svg:clipPath")
            .attr("id", "bottom_sawtooth")
            .attr("clipPathUnits", "objectBoundingBox")
            .append("path")
            .attr("d", mask);

        mask = study.makeSawtoothClipPath("top", h, n);
        study.stubs[i].defs.append("svg:clipPath")
            .attr("id", "top_sawtooth")
            .attr("clipPathUnits", "objectBoundingBox")
            .append("path")
            .attr("d", mask);

        study.stubs[i].step_event_layer = study.stubs[i].g.append('g');
        study.stubs[i].step_message_layer = study.stubs[i].g.append('g');
    }

    // Initialize masks for glyphs
    glyph_modules.define_blur();


};  // study vars

study.makeSawtoothClipPath = function(type, height, number){
  // "M 1,1 1,0 0,0 0,1 0.05,0.85 0.10,1 0.15,0.85 0.20,1 0.25,0.85 0.30,1 0.35,0.85 0.40,1 0.45,0.85 0.50,1 0.55,0.85 0.60,1 0.65,0.85 0.70,1 0.75,0.85 0.80,1 0.85,0.85 0.90,1 0.95,0.85 1,1 "
   var path = "M"
   var step = (1/number)/2;
   var ptr = step;
   var origin = 0;


   if(type === "top"){
     path += " 1,0 1,1 0,1 0,0";
     origin = 0;
   } else{
     height = 1 - height;
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

   path += " z"

   return path
}
//returns a list of scales representing a tuple
 // 0 is question
 // 1 is comparator
study.construct_y_scales = function(question) {
  var y_scales = [];
  var q = {};
  var a = {};

  q.rows = question.question_sample.grid_size[0];
  a.rows = study.empty_draw_grid.grid_size[0];

  y_scales.push(
    d3.scaleLinear()
      .domain([0, q.rows + 1])
      .range([0, study.full_height])
    );
  y_scales.push(d3.scaleLinear()
    .domain([0, a.rows + 1])
    .range([0, study.full_height]));

  return y_scales;
}

study.show_question = function (question) {


    study.cols = question.question_sample.grid_size[1];
    study.rows = question.question_sample.grid_size[0];

    for (var i = 0; i < question.choices.length; i++) {
        study.cols = d3.max([study.cols, question.choices[i].grid_size[1]]);
        study.rows = d3.max([study.rows, question.choices[i].grid_size[0]]);
    }

    study.current_step_span = study.cols;

    // adding multiple scales
    // study.ext = d3.extent(study.rows);
    // study.show_ext = [0, study.rows + 1];
    // study.step_y_scale.domain([study.show_ext[0], study.show_ext[1]]);

    study.y_scales = study.construct_y_scales(question);

    if (study.cols > 12) {
        study.step_x_scale.domain([0, study.cols + 1]);
    } else {
        study.step_x_scale.domain([0, 2]);
    }

    console.log(question);
    $('#q-para').html(question.question_text);
    study.draw_grid(question.question_sample, study.stubs[0], study.y_scales[0], question);

    $('#check-a').attr('checked', false);
    study.draw_grid(study.empty_draw_grid, study.stubs[1], study.y_scales[1], question);

};

study.init = function (json) {
    study.tutorial = json.tutorial;
    study.tutorial_no = 0;
    study.showing_tutorial = true;
    study.questions = json.questions;
    study.question_no = -1;
    study.question_start = Date.now();
    var num_questions = json.questions.length;
    var unshuffled = [...Array(num_questions).keys()];
    study.question_order = shuffle(unshuffled);


    study.show_question(study.tutorial[study.tutorial_no]);


    //study.show_question(study.questions[study.question_order[study.question_no]]);
};

study.updateTitle = function (q){
  $('title').text(q['question_id'] + study.tutorial_no);
}

study.update = function () {

    study.question_start = Date.now();

    if (study.tutorial_no + 1 >= study.tutorial.length) {
        study.showing_tutorial = false;
    }

    if (study.showing_tutorial) {
        study.tutorial_no++;
        study.show_question(study.tutorial[study.tutorial_no]);

        study.updateTitle(study.tutorial[study.tutorial_no]);
        print();
    } else {
        study.question_no++;
        if (study.question_no < study.questions.length) {
            study.show_question(study.questions[study.question_order[study.question_no]]);
        } else {
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


study.fetchPath = function(id, grid_items, grid, question){
  if(id >= grid_items.length - 2){
    if(question['representation'] === "partial" && grid.draw_grid_flag !== true){
      if(question['other_characteristics']['partial_loc'] === "top" || question['other_characteristics']['partial_loc'] === "middle"){
        return "url(#bottom_sawtooth)";
      }
    }
  }
  if(id < 2){
    if(question['representation'] === "partial" && grid.draw_grid_flag !== true){
      if(question['other_characteristics']['partial_loc'] === "bottom" || question['other_characteristics']['partial_loc'] === "middle"){
        return "url(#top_sawtooth)";
      }
    }
  }

}

study.draw_grid = function (grid, stub, y_scale, question) {
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
        .attr('class', d => {
           if (typeof(grid.draw_grid_flag) == "undefined"){
              return d.selected ? "selected event" : "ghost event"
            } else {
              return "off event";
            }
        })
        .attr('clip-path', d=>{
          return study.fetchPath(d.cell_id, grid_items, grid, question);
        });

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
        .attr('class', d => {
          if (typeof(grid.draw_grid_flag) == "undefined"){
            return d.selected ? "selected event" : "ghost event"
          } else {
            return "off event";
          }
        })
        .attr('clip-path', d=>{
          return study.fetchPath(d.cell_id, grid_items, grid, question);
        })
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
