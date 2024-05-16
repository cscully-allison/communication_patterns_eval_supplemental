// setup
state = localStorage.getItem("state");
if(state == null){
    state = "context";
    $('#back-button').hide();
}


tutorial_phases = [$("#context"), $("#patterns"), $("#stride"), $("#final-acknowledgement")]

// add button functionality
$("#next-button").click(function(){
    state = "patterns";
    localStorage.setItem('state', state);
    
    update();
})

$("#back-button").click(function(){

    switch(state){
        // case "end_of_tutorial":
        //     state = "stride";
        //     break;

        case "stride":
            state = "patterns";
            break;

        case "patterns":
            state = "context";
            break;    
    }

    localStorage.setItem('state', state);

    update();
});

function update(){
    var on = 0;
    switch(state){
        case "context":
            on = 0;
            break;
        case "patterns":
            on = 1;
            break;
        case "stride":
            on = 2;
            break;
        // case "end_of_tutorial":
        //     on = 3;
        //     break;
        default:
            on = 0
            break;
    }

    //overwrite prior switch if end of tutorial
    // flag is set
    if(localStorage.getItem('eot') == 'true'){
        on = 3;
    }

    for (var i = 0; i < tutorial_phases.length; i++){
        if(i == on){
            tutorial_phases[i].show()
        }
        else{
            tutorial_phases[i].hide()
        }
    }

    if (state == "context"){
        $('#back-button').hide();
    } else{
        $('#back-button').show();
    }

    //reset scroll positon
    $("body").scrollTop(0);

}

update();
