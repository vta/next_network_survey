var VTA = VTA || {};
VTA.user_language = (navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage)).toLowerCase();


VTA.Survey = VTA.Survey || {};
VTA.Survey.SERVER = ['http://localhost:5000/survey', 'https://young-sea-59324.herokuapp.com/survey'][0];



VTA.Countdown = {
  counter : 3,
  exhausted : function(){
    return this.counter <= 0;
  },
  getCount : function(){
    return this.counter;
  },
  decrement : function(){
    this.counter = this.counter -1;
    return this.counter;
  },
  reset : function(){
    this.counter = 3;
    return this.counter;
  }
};




/*
 * @constructor
 */
VTA.domg = function(data, elem, display_type) {
  this.type = 'bar';
  if (display_type && display_type==='marker'){
    this.type = 'marker';
  }

  $(elem).empty();
  this.$elem = $('<ol id="domg"/>').appendTo(elem);
  this.data = data;

  if (this.type === 'marker') {
    this.show_markers();
  } else {
    this.show_bars();
  }
};


VTA.domg.prototype.show_bars = function() {
  window.console.log('show_bars');
  var self = this;
  $.each(this.data, function(i, item) {
    var $bar_wrapper = $('<li/>')
      .addClass('horiz-bar-wrapper');

    var bar = $('<div/>')
      .addClass('horiz-bar')
      .data('name', item['name']).appendTo($bar_wrapper);

    var sub_label = 'bar_' + item['values'].length;

    $.each(item['values'], function(j, val) {
      var bar_fill_wrapper = $('<div/>')
        .addClass('bar-fill-wrapper')
        .addClass(sub_label)
        .text(val['label']);

      var fill = $('<div/>')
        .addClass('hidden')
        .data('value-pct', val['value-pct'])
        .data('label', val['label']);
      bar_fill_wrapper.append(fill);
      $bar_wrapper.append(bar_fill_wrapper);
    });

    self.$elem.append($bar_wrapper);
  });

  this.$elem.find('.horiz-bar .hidden').each(function(index, elem) {
    var $elem = $(elem);
    $elem.removeClass('hidden');
    $elem.addClass('bar-fill');
    setTimeout(function() {
      $elem.css('width', parseInt($elem.data('value-pct'), 10) + '%');
    }, 750);
  });
};

VTA.domg.prototype.show_markers = function() {
  var self = this;
  window.console.log('show_markers');

  function snapMarkersToPositions() {
    self.$elem.find('.graph-inner-wrapper .data-marker').each(function(index, elem) {
      var $elem = $(elem);
      var data_val = parseInt($elem.data('value-pct'), 10);
      markerToPos($elem, data_val);
      snapToTop($elem);
    });
  }

  function markerToPos($elem, val) {
    var parent_width = $elem.parent().width();
    var marker_width = $elem.width();
    var offset = parseInt($elem.parent().css('marginLeft'), 10) - $elem.parent().position().left;
    if (val > 60) {
      $elem.addClass('flip-right');
      offset += -(marker_width + 20) / 2;
    } else if (val > 40 && val < 60) {
      $elem.addClass('flip-center');
      offset += 0;
    } else {
      offset += (marker_width - 20) / 2;
    }
    $elem.css({
      left: parent_width * (val / 100) + offset + 'px'
    });
  }

  function snapToTop($elem) {
    if ($elem.hasClass('collides')) {
      $elem.css({
        top: ($elem.parent().position().top +$elem.parent().height() + 7) + 'px'
      });
    } else {
      $elem.css({
        top: ($elem.parent().position().top - $elem.height() + 7) + 'px'
      });
    }
  }

  $.each(this.data, function(i, item) {

    item['values'].sort(function(a, b) {
      return a['value-pct'] > b['value-pct'];
    });

    var outer_wrapper = $('<li/>')
      .addClass('graph-outer-wrapper')
      .appendTo(self.$elem);

    var inner_wrapper = $('<div/>')
      .addClass('graph-inner-wrapper')
      .appendTo(outer_wrapper);

    var sub_label = 'marker_' + item['values'].length;
    for (var j = 0; j < item['values'].length; j++) {
      var val = item['values'][j];
      var this_val = val['value-pct'];

      var collides = '';
      if (j > 0 && Math.abs(val['value-pct'] - item.values[j - 1]['value-pct']) <= 15) {
        collides = 'collides';
      }

      var $marker = $('<div/>')
        .addClass('data-marker')
        .addClass(sub_label)
        .addClass('hidden')
        .addClass(collides)
        .data('value-pct', val['value-pct'])
        .text(val['label'])
        .appendTo(inner_wrapper);
    }

    var bar = $('<div/>')
      .addClass('horiz-bar')
      .data('name', item['name'])
      .appendTo(inner_wrapper);

    var label_l = $('<span/>').addClass('left').text(item['labels'][0]).appendTo(outer_wrapper);
    var label_r = $('<span/>').addClass('right').text(item['labels'][1]).appendTo(outer_wrapper);
  });

  setTimeout(function() {
    self.$elem.find('.graph-inner-wrapper .data-marker').each(function(index, elem) {
      var $elem = $(elem);
      markerToPos($elem, 0);
      snapToTop($elem);
      $elem.removeClass('hidden');
    });
  }, 1);

  setTimeout(snapMarkersToPositions, 750);
  $(window).resize(snapMarkersToPositions);
};





/*
 * @constructor
 */
VTA.Survey.Results = function(id, results_elem_query_selector, providedSurveyValues) {
  this.SURVEY_API = VTA.Survey.SERVER;
  this.ProvidedSurveyValues = providedSurveyValues || null;
  this.survey_id = id;
  this.QuestionDefinitions = null;
  this.QuesitonTitles = [];
  this.SurveyAverageValues = null;
  this.results_wrapper = $(results_elem_query_selector);
};

VTA.Survey.Results.prototype.init = function() {
  var self = this;

  // get question definitions
  $.ajax({
    url: this.SURVEY_API + "/surveys/" + this.survey_id + "/?language=" + VTA.user_language
  }).done(function(response) {
    self.QuestionDefinitions = {};
    response['questions'].forEach(function(e) {
      self.QuestionDefinitions[e['pk']] = e;
      self.QuesitonTitles.push(e['title']);
    });
    self.show();
  });

  // get numeric results
  $.get(this.SURVEY_API + '/responses/' + this.survey_id + '/?output=average')
    .done(function(data) {

      self.SurveyAverageValues = data['averages'];
      self.SurveyResponseCount = data['stats']['count'];
      window.console.log('Received data from '+self.SurveyResponseCount +' survey responses.', self.SurveyAverageValues);
      self.show();
    });
};

VTA.Survey.Results.prototype.show = function($elem) {
  // check if we have everything we need
  if (this.QuestionDefinitions === null || this.SurveyAverageValues === null) {
    return;
  }

  var self = this;
  var domg_data = [];
  if (!this.ProvidedSurveyValues){
    Object.keys(this.SurveyAverageValues).map(function(key) {
      domg_data.push({
        "name": self.QuestionDefinitions[key].title,
        "labels": [
          self.QuestionDefinitions[key].answers[0].title,
          self.QuestionDefinitions[key].answers[1].title
        ],
        "values": [{
          "label": "average response",
          "value-pct": 100 * ((self.SurveyAverageValues[key]-1) / (self.QuestionDefinitions[key].scale_max-1))
        }]
      });
    });
  } else {
    domg_data = this.ProvidedSurveyValues;
  }

  var d = new VTA.domg(domg_data, this.results_wrapper[0], 'marker');
};


// FIXME: hack!
VTA.Survey.NULL_ANSWER_PK = 38;

/*
 * @constructor
 * @param s_args = { form_elem : Element, survey_targets : { number|string : string }, results_elem : Element }
 */
VTA.Survey.Controller = function(s_args) {
  /* s_args might look like this:
    {
        form_elem : document.getElementById('main_form'),
        survey_targets : { 2 : '#survey_wrapper', 1 : '#demographics_wrapper'},
        results_elem : document.getElementById('results_wrapper')
    }
  */
  var self = this;

  this.SURVEY_API = VTA.Survey.SERVER;
  this.survey_targets = s_args['survey_targets'];

  this.survey_ids = Object.keys(this.survey_targets)

  this.QuestionDefinitions = {};
  this.user_response = [];

  this.questions_wrapper = null;
  this.$main_form = $(s_args['form_elem']);
  this.results_wrapper = s_args['results_elem'];
  this.survey_sections = [];
};

VTA.Survey.Controller.prototype.init = function() {
  var self = this;


  this.$main_form.on('submit', function(event) {
    event.preventDefault();
    self.ok();
  });

  for (var i = 0; i < this.survey_ids.length; i++) {
    if (isNaN(parseInt(this.survey_ids[i], 10))) {
      window.console.log('Invalid survey ID: it must be an integer.');
      continue;
    }
    
    var section_elem = $('<ol id=survey_' + this.survey_ids[i] + '/>').addClass('questions_wrapper').appendTo(this.survey_targets[this.survey_ids[i]]['target_elem']);
    this.survey_targets[this.survey_ids[i]].section_elem = section_elem;

    window.console.log('Fetching survey data for lanuage:', VTA.user_language);
    $.ajax({
      url: this.SURVEY_API + "/surveys/" + this.survey_ids[i] + "/?language=" + VTA.user_language,
      headers: {
        'Accept-Language': VTA.user_language
      }
    }).error(function(jqXHR, textStatus, errorThrown) {
      window.console.log('failed to get survey questions', jqXHR, textStatus, errorThrown);
      if (jqXHR.status === 500) {
        window.console.log('trying English language');
        VTA.user_language = 'en-us';
        if (!VTA.Countdown.exhausted()){
          VTA.Countdown.decrement();
          self.init();
        }
      }

    }).done(function(response) {
      VTA.Countdown.reset();
      response.questions.sort(function(a,b){ return a.position > b.position;});
      var survey_id = response["pk"];
      var elem = self.survey_targets[survey_id].section_elem;
      self.survey_sections.push(new VTA.Survey.Section(elem, survey_id, response['questions']));

      self.QuestionDefinitions[response["pk"]] = {};
      for (var k = 0; k < response['questions'].length; k++) {
        self.QuestionDefinitions[survey_id][response['questions'][k]['pk']] = response['questions'][k];
      }

      $('input[type="range"]').rangeslider({
        polyfill: false
      });

      $('.selectpicker').selectpicker({
        style: 'btn-info',
        size: 4
      });

    });
  }
};

VTA.Survey.Controller.prototype.getFormResults = function(formElement) {
  var formElements = formElement[0].elements;
  user_response = {};
  var i = 0;
  var elem = null;
  for (i = 0; i < formElements.length; i += 1) {
    elem = formElements[i];
    // window.console.log(elem, elem.type);
    if (!elem.name || elem.name.length < 1) continue;
    var survey_id = $(elem).data('survey-id');
    var q = this.QuestionDefinitions[survey_id][elem.name];
    user_response[survey_id] = user_response[survey_id] || [];
    switch (elem.type) {
      case 'submit':
        break;
      case 'radio':
        if (elem.checked) {
          user_response[survey_id].push({
            "question": q['pk'],
            "answer": q.answers[0]['pk']
          });
        }
        break;
      case 'checkbox':
        if (elem.checked) {
          user_response[survey_id].push({
            "question": q['pk'],
            "answer": q.answers[0]['pk']
          });
        }
        break;
      case 'range':
        var answer = q.answers[0]['pk'];
        if (q.scale_max / 2 < parseInt(elem.value, 10)) {
          // the slider is closer to the left value than the right
          answer = q.answers[1]['pk'];
        }
        user_response[survey_id].push({
          "question": q['pk'],
          "answer": answer,
          "other_answer_numeric": elem.value
        });
        break;
      case 'text':
        user_response[survey_id].push({
          "question": q['pk'],
          "answer": VTA.Survey.NULL_ANSWER_PK,
          "other_answer": elem.value
        });
        break;
      case 'select-one':
        user_response[survey_id].push({
          "question": q['pk'],
          "answer": elem.value
        });
        break;
      default:
        user_response[survey_id].push({
          "question": q['pk'],
          "answer": q.answers[0]['pk'],
          "other_answer": elem.value
        });
        break;
    }
  }
  return user_response;
};

VTA.Survey.Controller.prototype.done = function(user_answers) {
  var self = this;
  for (var i = 0; i < this.survey_ids.length; i++) {
    var user_data = JSON.stringify(user_answers[this.survey_ids[i]], null, ' ');

    $.post(this.SURVEY_API + '/responses/', user_data)
      .done(function(data) {
        window.console.log('Received data from '+self.SurveyResponseCount +' survey responses.');
      });
  }

  var survey_id = 2;

  $.get(this.SURVEY_API + '/responses/' + survey_id + '/?output=average')
    .done(function(data) {

      self.SurveyAverageValues = data['averages'];
      self.SurveyResponseCount = data['stats']['count'];
      window.console.log('Received data from '+self.SurveyResponseCount +' survey responses.');

      var user_responses_indexed = {};
      for (var i= 0; i < user_answers[survey_id].length; i++){
        user_responses_indexed[user_answers[survey_id][i]['question']] = parseInt(user_answers[survey_id][i]['other_answer_numeric'],10);
      }
      
      var domg_data = [];
      var q_id = null;
      for (var i = 0; i < user_answers[survey_id].length; i++){
        q_id = user_answers[survey_id][i]['question'];
        domg_data.push({
          "name": self.QuestionDefinitions[survey_id][q_id].title,
          "labels": [
            self.QuestionDefinitions[survey_id][q_id].answers[0].title,
            self.QuestionDefinitions[survey_id][q_id].answers[1].title
          ],
          "values": [{
            "label": "average response",
            "value-pct": 100 * ((self.SurveyAverageValues[q_id]-1) / (self.QuestionDefinitions[survey_id][q_id]['scale_max']-1))
          }, {
            "label": "your response",
            "value-pct": 100 * ((user_responses_indexed[q_id]-1) / (self.QuestionDefinitions[survey_id][q_id]['scale_max']-1))  // FIXME! not actual number
          }]
        });
      }
      var d = new VTA.domg(domg_data, self.results_wrapper, 'marker');
    });
};

VTA.Survey.Controller.prototype.ok = function() {
  var postData = this.getFormResults(this.$main_form);

  window.console.log(postData);

  if (this.$main_form[0].checkValidity()) {
    this.done(postData);
  }
};



/*
 * @constructor
 */
VTA.Survey.Section = function(section_elem, section_id, quesiton_definitions) {
  this.questions_wrapper = $(section_elem);
  this.QuestionDefinitions = {};
  this.section_id = section_id;
  this.answer_index = 0;
  this.question_index = 0;

  var self = this;
  quesiton_definitions.forEach(function(e) {
    self.QuestionDefinitions[e['pk']] = e;
    var type = e.type;
    if (type === "radio") {
      self.addRadioQuestion(e);
    } else if (type === "range") {
      self.addRangeQuestion(e);
    } else if (type === "checkbox") {
      self.addCheckboxQuestion(e);
    } else if (type === "dropdown") {
      self.addDropdownQuestion(e);
    } else if (type === "text" || type === "zipcode") {
      self.addTextQuestion(e);
    }
  });
};

VTA.Survey.Section.prototype.addRadioQuestion = function(o) {
  var qid = o.pk;
  var question = o.title;
  var answers = o.answers;
  var required = o['required'];
  var self = this;
  if (answers.length < 2) {
    window.console.warn('Malformed question: need at least two answers to a "radio" question.', o);
    return;
  }
  var $frag = $(document.createDocumentFragment());
  var $q_wrapper = $('<li class="question radio"/>');

  $('<p>').text(question).appendTo($frag);

  answers.forEach(function(ans) {
    $('<input type="radio"/>').attr({
      id: 'a_' + self.answer_index,
      name: qid,
      required: required,
      value: ans['pk'],
      'data-survey-id': self.section_id
    }).appendTo($q_wrapper);

    $('<label/>').attr({
      for: 'a_' + self.answer_index
    }).text(ans['title']).appendTo($q_wrapper);

    self.answer_index += 1;
  });

  this.question_index += 1;
  $q_wrapper.appendTo($frag);
  $frag.appendTo(this.questions_wrapper);
};

VTA.Survey.Section.prototype.addTextQuestion = function(o) {
  var qid = o.pk;
  var question = o.title;
  var answers = o.answers;
  var type = o.type;

  var $frag = $(document.createDocumentFragment());
  var $q_wrapper = $('<li class="question text"/>');

  $('<label/>').attr({
    for: 'a_' + this.answer_index
  }).text(question).appendTo($q_wrapper);

  var $select = null;
  if (type === 'zipcode'){
    $select = $('<input type="text"/>').attr({
      name: qid,
      type : "number",
      pattern: "[0-9]*",
      maxlength : "5",
      min:"0",
      id: 'a_' + self.answer_index,
      'data-survey-id': this.section_id
    }).appendTo($q_wrapper);
  } else {
    $select = $('<input type="text"/>').attr({
      name: qid,
      'data-survey-id': this.section_id,
      id: 'a_' + self.answer_index,
    }).appendTo($q_wrapper);
  }
   
  this.question_index += 1;
  $frag.append($q_wrapper);
  $frag.appendTo(this.questions_wrapper);
};



VTA.Survey.Section.prototype.addDropdownQuestion = function(o) {
  var qid = o.pk;
  var question = o.title;
  var answers = o.answers;
  var self = this;
  if (answers.length < 2) {
    window.console.warn('Malformed question: need at least two answers to a "dropdown" question.', o);
    return;
  }
  var $frag = $(document.createDocumentFragment());
  var $q_wrapper = $('<li class="question dropdown"/>').appendTo($frag);

  var $select = $('<select/>').attr({
    name: qid,
    'data-survey-id': this.section_id,
    title : question,
    'data-width':"50%"
  }).addClass('selectpicker').appendTo($frag);

  answers.forEach(function(ans) {
    $('<option/>').attr({
      value: ans['pk']
    }).text(ans['title']).appendTo($select);

    self.answer_index += 1;
  });

  this.question_index += 1;
  $frag.appendTo(this.questions_wrapper);
};

VTA.Survey.Section.prototype.addCheckboxQuestion = function(o) {
  var qid = o.pk;
  var question = o.title;
  var answers = o.answers;
  var self = this;
  if (answers.length < 0) {
    window.console.warn('Malformed question: need at least one answer to a "checkbox" question.', o);
    return;
  }

  var $frag = $(document.createDocumentFragment());
  var $q_wrapper = $('<li class="question checkbox"/>');

  $('<p>').text(question).appendTo($frag);

  answers.forEach(function(ans) {
    $('<input type="checkbox"/>').attr({
      id: 'a_' + self.answer_index,
      name: qid,
      value: ans['choice_text'],
      'data-survey-id': this.section_id
    }).appendTo(this.$q_wrapper);

    $('<label/>').attr({
      for: 'a_' + self.answer_index
    }).text(ans['choice_text']).appendTo($q_wrapper);

    self.answer_index += 1;
  });
  this.question_index += 1;

  $frag.append($q_wrapper);
  $frag.appendTo(this.questions_wrapper);
};

VTA.Survey.Section.prototype.addRangeQuestion = function(o) {
  var qid = o.pk;
  var question = o.title;
  var answers = o.answers;
  var input_vals = {
    'min': o.scale_min,
    'max': o.scale_max,
    'step': 1
  };

  if (answers.length !== 2) {
    window.console.warn('Malformed question: need two and only two answers for a "range" question.', o);
    return;
  }

  var $frag = $(document.createDocumentFragment());

  var $q_wrapper = $('<li class="question range"/>');

  $('<span class="question_index">').text(this.question_index + 1).appendTo($q_wrapper);

  $('<label>').attr({
    for: 'a_' + this.answer_index
  }).text(question).appendTo($q_wrapper);

  var $input_wrapper = $('<div class="input_wrapper"/>').appendTo($q_wrapper);

  var $left_option = $('<div>').addClass('left').text(answers[0].title);
  var $right_option = $('<div>').addClass('right').text(answers[1].title);

  var dl_id = 'q_' + this.question_index + '_dl';
  $('<input type="range"/>')
    .attr({
      id: 'a_' + self.answer_index,
      name: qid,
      required: true,
      list: dl_id,
      min: input_vals.min,
      max: input_vals.max,
      step: input_vals.step,
      value: input_vals.min + (input_vals.max - input_vals.min) / 2,
      'data-survey-id': this.section_id
    }).appendTo($input_wrapper);
  
  $left_option.appendTo($input_wrapper);
  $right_option.appendTo($input_wrapper);

  this.answer_index += 1;
  this.question_index += 1;

  $frag.append($q_wrapper);
  $frag.appendTo(this.questions_wrapper);
};
