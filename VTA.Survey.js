var VTA = VTA || {}


VTA.guess_language = function(){
  var lang = (navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage))
  .toLowerCase()
  var supported_languages = ['en-us','es','ko', 'tgl', 'vi', 'zh-hans']
  var default_lang = supported_languages[0]
  if (!lang || lang.length < 2){
    return default_lang
  }
  lang = lang.toLowerCase()
  if (lang.slice(0,2) === 'es')
    return supported_languages[1]
  if (lang.slice(0,2) === 'ko')
    return supported_languages[2]
  if (lang === 'tl' || lang === 'tgl')
    return supported_languages[3]
  if (lang === 'vi')
    return supported_languages[4]
  if (lang.slice(0,2) === 'zh')
    return supported_languages[5]
  return default_lang
}
VTA.user_language = VTA.guess_language()



VTA.Survey = VTA.Survey || {}
VTA.Survey.SERVER = ['http://localhost:5000/survey', 'https://young-sea-59324.herokuapp.com/survey', 'http://ec2-54-191-100-57.us-west-2.compute.amazonaws.com/survey'][0]

VTA.Countdown = {
  counter: 3,
  exhausted: function () {
    return this.counter <= 0
  },
  getCount: function () {
    return this.counter
  },
  decrement: function () {
    this.counter = this.counter - 1
    return this.counter
  },
  reset: function () {
    this.counter = 3
    return this.counter
  }
}

VTA.util = VTA.util || {}
VTA.util.normalize = function (min, max, value) {
  return (value - min) / (max - min)
}

VTA.util.muxText = function (text1, text2) {
  var t1_matches = text1.match(/\d+/g)
  var t2_matches = text2.match(/\d+/g)
  var val1, val2, middle_val
  var middle_text = text1
  for (var i = 0; i < Math.min(t1_matches.length, t2_matches.length); i++) {
    val1 = parseInt(t1_matches[i], 10)
    val2 = parseInt(t2_matches[i], 10)
    middle_val = Math.abs(val1 - val2) / 2 + Math.min(val1, val2)
    middle_text = middle_text.replace(val1, middle_val)
  }
  return middle_text
}

VTA.util.getCookie = function (context, cname) {
  // http://stackoverflow.com/a/25783811/940217
  var name = cname + '='
  var ca = document.cookie.split(';')
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i]
    while (c.charAt(0) == ' ') c = c.substring(1)
    if (c.indexOf(name) != -1) return c.substring(name.length, c.length)
  }
  return ''
}

// stackoverflow.com/a/35055914/940217
VTA.util.stringisNullOrWhitespace = function (val) {
  return this.isStringNullOrEmpty(val) || val.replace(/\s/g, '') === ''
}

VTA.util.stringisNullOrWhitespace = function (val) {
  switch (val) {
    case '':
    case 0:
    case '0':
    case null:
    case false:
    case undefined:
    case typeof this === 'undefined':
      return true
    default:
      return false
  }
}

VTA.global = VTA.global || {}
VTA.global.sessionids = VTA.global.sessionids || []

/*
 * @constructor
 */
VTA.Survey.BudgetMeter = function (args) {
  this.baseline = args['baseline']
  this.maxval = NaN
  this.$submit_button = $(args['submit_button'])
  this.label_unit = args['label_unit']
  this.$target_elem = $(args['target_elem'])
  this.$target_elems = $(args['target_elems'])
  this.baseline_label_text = args['baseline_label_text']
  this.data_target = args['data_target']
  this.$meter_elem = $(args['meter_elem'])
  this.$budget_text_status = null
  this.$budget_summary_elem = $(args['budget_summary_elem'])
  this.budget_colors = args['budget_colors']
  this.top_threshold = document.querySelector(args['meter_elem']).getBoundingClientRect().top
  console.log('setting up meter on ', this.$meter_elem)
}

VTA.Survey.BudgetMeter.prototype.update = function () {
  console.log('Budget Meter update()')

  var budget_offset = this.getBudgetOffset()

  var fill_pct = ((this.baseline + budget_offset) / this.maxval) * 100
  $('.meter-fill').css('width', fill_pct + '%')
  $('.meter-label').text('$' + (this.baseline + budget_offset) + this.label_unit)
  this.updateTextStatus(budget_offset)

  if (budget_offset === 0) {
    this.$budget_summary_elem.html('You have designed a transit system that uses the same amount of money as the current budget.')
  } else if (budget_offset > 0) {
    this.$budget_summary_elem.html('You have designed a transit system that would increase the current budget by $' + Math.abs(budget_offset) + this.label_unit + '.')
    $('.meter-fill').addClass('meter_over_budget')
  } else {
    this.$budget_summary_elem.html('You have designed a transit system that would decrease the current budget by $' + Math.abs(budget_offset) + this.label_unit + '.')
    $('.meter-fill').removeClass('meter_over_budget')
  }

  this.updateSubmitButton()
}

VTA.Survey.BudgetMeter.prototype.getBudgetOffset = function () {
  var budget_offset = 0
  var checked_inputs = this.$target_elem.find('input:checked')
  for (var i = 0; i < checked_inputs.length; i++) {
    var v = $(checked_inputs[i]).data('meta-integer')
    v = parseInt(v, 10)
    if (!isNaN(v)) {
      // v = v < 0 ? v * 2 : v // exaggerate the decreasing values 
      budget_offset = budget_offset + v
    }
  }
  return budget_offset
}

VTA.Survey.BudgetMeter.prototype.updateTextStatus = function (budget_offset) {
  var budget_over_under_by = '$' + Math.abs(budget_offset) + this.label_unit + '<br/>'
  var budget_over_under_text = budget_offset < 0 ? 'decrease' : budget_offset === 0 ? '' : 'increase'
  this.$budget_text_status.html((budget_offset === 0 ? '' : budget_over_under_by) + budget_over_under_text)
// $('.meter-fill').css('background-color', this.getBarColor(budget_offset / (this.maxval - this.baseline)))
}

VTA.Survey.BudgetMeter.prototype.updateSubmitButton = function () {
  this.$submit_button.text('Submit a $' + (this.baseline + this.getBudgetOffset()) + this.label_unit + ' budget')
}

VTA.Survey.BudgetMeter.prototype.getBarColor = function (factor) {
  // factor should be between [0,1]
  var budget_colors = this.budget_colors
  if (!budget_colors || budget_colors.length != 2) {
    return
  }
  function padToTwo (numberString) {
    if (numberString.length < 2) {
      numberString = '0' + numberString
    }
    return numberString
  }
  if (factor <= 0) { return budget_colors[0]}
  if (factor >= 1) { return budget_colors[1]}
  var c1 = [budget_colors[0].substr(1, 2), budget_colors[0].substr(3, 2), budget_colors[0].substr(5, 2)].map(function (e) {return parseInt(e, 16)})
  var c2 = [budget_colors[1].substr(1, 2), budget_colors[1].substr(3, 2), budget_colors[1].substr(5, 2)].map(function (e) {return parseInt(e, 16)})
  var mid_r = (Math.floor((c2[0] - c1[0]) * factor)) + c1[0]
  var mid_g = (Math.floor((c2[1] - c1[1]) * factor)) + c1[1]
  var mid_b = (Math.floor((c2[2] - c1[2]) * factor)) + c1[2]

  var res = [mid_r, mid_g, mid_b]
  console.log(res)
  res = res.map(function (o) {
    o = Math.min(255, o)
    return padToTwo(o.toString(16))
  })

  var res_hex = '#' + res.join('')
  console.log(res_hex)
  return res_hex
}

VTA.Survey.BudgetMeter.prototype.show = function () {
  console.log('Budget Meter show()')
  var self = this

  // find max value of all the 'data_target' metas, clustering by input name
  var clustered = {}
  var inputs = this.$target_elems
  for (var i = 0; i < inputs.length; i++) {
    $(inputs[i]).change(function () {self.update()})
    var n = inputs[i]['name']
    var v = $(inputs[i]).data('meta-integer')
    if (!clustered[n]) {
      clustered[n] = []
    }
    v = parseInt(v, 10)
    if (!isNaN(v)) {
      clustered[n].push(v)
    }
  }
  var k = Object.keys(clustered)
  var min = 0
  var max = 0
  for (i = 0; i < k.length; i++) {
    min = min + Math.min.apply(null, clustered[k[i]])
    max = max + Math.max.apply(null, clustered[k[i]])
  }
  this.minval = this.baseline + min
  this.maxval = this.baseline + max
  console.log('min : ' + this.minval + ', max : ' + this.maxval)
  var baseline_pct = (this.baseline / this.maxval) * 100

  var meter_wrapper = $('<div/>')
    .addClass('meter-inner-wrapper')

  var meter_text = $('<span/>')
    .addClass('meter-label')
    .data('value-int', this.baseline)
    .text('$' + this.baseline + this.label_unit)

  var fill_wrapper = $('<div/>')
    .addClass('meter-fill-wrapper')

  var fill = $('<div/>')
    .addClass('meter-fill')
    .css('width', 0 + '%')
    .data('value-pct', baseline_pct)

  var fill_budget_level = $('<div/>')
    .addClass('meter-fill-budget-level')
    .css('width', baseline_pct + '%')

  var fill_max_level = $('<div/>')
    .addClass('meter-fill-max-level')
    .css('width', '100%')

  var budget_indicator = $('<div/>')
    .addClass('meter-budget-indicator')
  budget_indicator.css('left', baseline_pct + '%')
    .text(self.baseline_label_text + self.baseline + self.label_unit)

  this.$budget_text_status = $('<div/>')
    .addClass('meter-budget-status')

  fill.append(meter_text)
  fill_wrapper.append(fill)
  fill_wrapper.append(fill_budget_level)
  fill_wrapper.append(fill_max_level)
  fill_wrapper.append(budget_indicator)
  meter_wrapper.append(fill_wrapper)

  this.$meter_elem.append(meter_wrapper)
  fill_wrapper.append(this.$budget_text_status)
  this.updateTextStatus(0)
  this.updateSubmitButton()
  setTimeout(function () {
    fill.css('width', baseline_pct + '%')
    var indicator_pos = document.querySelector('.meter-fill-budget-level').getBoundingClientRect().right
    // self.top_threshold = self.$meter_elem[0].getBoundingClientRect().top
    self.top_threshold = self.$meter_elem.offset().top
  // budget_indicator.css('left', (indicator_pos - Math.floor(budget_indicator.outerWidth(true) / 2)) + 'px')
  }, 750)

  // $(document).scroll(function (e) {
  //   if ($(window).scrollTop() > (self.top_threshold)) {
  //     meter_wrapper.addClass('fixed')
  //   } else {
  //     meter_wrapper.removeClass('fixed')
  //   }
  // })

  // window.ontouchmove = function (e) {
  //  if ($(window).scrollTop() > (self.top_threshold)) {
  //    meter_wrapper.addClass('fixed')
  //  } else {
  //    meter_wrapper.removeClass('fixed')
  //  }
  // }
  setInterval(function () {
    if ($(window).scrollTop() > (self.top_threshold)) {
      meter_wrapper.addClass('fixed')
    } else {
      meter_wrapper.removeClass('fixed')
    }
  }, 50)
}

/*
 * @constructor
 */
VTA.domg = function (args) {
  this.type = 'bar'
  if (args['display_type'] && args['display_type'] === 'marker') {
    this.type = 'marker'
  }

  $(args['target'])
    .empty()
  this.$elem = $('<ol id="domg"/>')
    .appendTo(args['target'])
  this.data = args['data']
  this.alternate = !!args['alternate']

  if (this.type === 'marker') {
    this.show_markers()
  } else {
    this.show_bars()
  }
}

VTA.domg.prototype.show_bars = function () {
  window.console.log('show_bars')
  var self = this
  $.each(this.data, function (i, item) {
    var $bar_wrapper = $('<li/>')
      .addClass('horiz-bar-wrapper')

    var bar = $('<div/>')
      .addClass('horiz-bar')
      .data('name', item['name'])
      .appendTo($bar_wrapper)

    var sub_label = 'bar_' + item['values'].length

    $.each(item['values'], function (j, val) {
      var bar_fill_wrapper = $('<div/>')
        .addClass('bar-fill-wrapper')
        .addClass(sub_label)
        .text(val['label'])

      var fill = $('<div/>')
        .addClass('hidden')
        .data('value-pct', val['value-pct'])
        .data('label', val['label'])
      bar_fill_wrapper.append(fill)
      $bar_wrapper.append(bar_fill_wrapper)
    })

    self.$elem.append($bar_wrapper)
  })

  this.$elem.find('.horiz-bar .hidden')
    .each(function (index, elem) {
      var $elem = $(elem)
      $elem.removeClass('hidden')
      $elem.addClass('bar-fill')
      setTimeout(function () {
        $elem.css('width', parseInt($elem.data('value-pct'), 10) + '%')
      }, 750)
    })
}

VTA.domg.prototype.show_markers = function () {
  var self = this
  window.console.log('show_markers')

  function snapMarkersToPositions () {
    self.$elem.find('.graph-inner-wrapper .data-marker')
      .each(function (index, elem) {
        var $elem = $(elem)
        var data_val = parseInt($elem.data('value-pct'), 10)
        markerToPos($elem, data_val)
        snapToTop($elem)
      })
  }

  function markerToPos ($elem, val) {
    var parent_width = $elem.parent()
      .width()
    var marker_width = $elem.width()
    var offset = parseInt($elem.parent()
      .css('marginLeft'), 10) - $elem.parent()
      .position()
      .left
    if (val > 60) {
      $elem.addClass('flip-right')
      offset += -(marker_width + 20) / 2
    } else if (val > 40 && val < 60) {
      $elem.addClass('flip-center')
      offset += 0
    } else {
      offset += (marker_width - 20) / 2
    }
    $elem.css({
      left: parent_width * (val / 100) + offset + 'px'
    })
  }

  function snapToTop ($elem) {
    if ($elem.hasClass('collides')) {
      $elem.css({
        top: ($elem.parent()
            .position()
            .top + $elem.parent()
            .height() + 7) + 'px'
      })
    } else {
      $elem.css({
        top: ($elem.parent()
            .position()
            .top - $elem.height() + 7) + 'px'
      })
    }
  }

  $.each(this.data, function (i, item) {
    if (!self.alternate) {
      item['values'].sort(function (a, b) {
        return a['value-pct'] > b['value-pct']
      })
    }

    var outer_wrapper = $('<li/>')
      .addClass('graph-outer-wrapper')
      .appendTo(self.$elem)

    var inner_wrapper = $('<div/>')
      .addClass('graph-inner-wrapper')
      .appendTo(outer_wrapper)

    var sub_label = 'marker_' + item['values'].length
    for (var j = 0; j < item['values'].length; j++) {
      var val = item['values'][j]
      var val_pct = val['value-pct']

      // collision detection depends on items.values being sorted in increasing order
      var collides = j > 0 && Math.abs(val_pct - item.values[j - 1]['value-pct']) <= 9

      if (self.alternate) {
        collides = j % 2 == 1
      }

      var $marker = $('<div/>')
        .addClass('data-marker')
        .addClass(sub_label)
        .addClass('hidden')
        .addClass(collides ? 'collides' : '')
        .data('value-pct', val_pct)
        .text(val['label'])
        .appendTo(inner_wrapper)
    }

    var bar = $('<div/>')
      .addClass('horiz-bar')
      .data('name', item['name'])
      .appendTo(inner_wrapper)

    var label_l = $('<span/>')
      .addClass('left')
      .text(item['labels'][0])
      .appendTo(outer_wrapper)
    var label_r = $('<span/>')
      .addClass('right')
      .text(item['labels'][1])
      .appendTo(outer_wrapper)
  })

  setTimeout(function () {
    self.$elem.find('.graph-inner-wrapper .data-marker')
      .each(function (index, elem) {
        var $elem = $(elem)
        markerToPos($elem, 0)
        snapToTop($elem)
        $elem.removeClass('hidden')
      })
  }, 1)

  setTimeout(snapMarkersToPositions, 750)
  $(window)
    .resize(snapMarkersToPositions)
}

/*
 * @constructor
 */
VTA.Survey.Results = function (id, results_elem_query_selector, providedSurveyValues) {
  this.SURVEY_API = VTA.Survey.SERVER
  this.ProvidedSurveyValues = providedSurveyValues || null
  this.survey_id = id
  this.QuestionDefinitions = null
  this.QuesitonTitles = []
  this.SurveyAverageValues = null
  this.results_wrapper = $(results_elem_query_selector)
}

VTA.Survey.Results.prototype.init = function () {
  var self = this

  // get question definitions
  $.ajax({
    url: this.SURVEY_API + '/surveys/' + this.survey_id + '/?language=' + VTA.user_language
  })
    .done(function (response) {
      self.QuestionDefinitions = {}
      response['questions'].forEach(function (e) {
        self.QuestionDefinitions[e['pk']] = e
        self.QuesitonTitles.push(e['title'])
      })
      self.show()
    })

  // get numeric results
  $.get(this.SURVEY_API + '/responses/' + this.survey_id + '/?output=average')
    .done(function (data) {
      self.SurveyAverageValues = data['averages']
      self.SurveyResponseCount = data['stats']['count']
      window.console.log('Received data from ' + self.SurveyResponseCount + ' survey responses.', self.SurveyAverageValues)
      self.show()
    })
}

VTA.Survey.Results.prototype.show = function ($elem) {
  // check if we have everything we need
  if (this.QuestionDefinitions === null || this.SurveyAverageValues === null) {
    return
  }

  var self = this
  var domg_data = []
  if (!this.ProvidedSurveyValues) {
    Object.keys(this.SurveyAverageValues)
      .map(function (key) {
        domg_data.push({
          'name': self.QuestionDefinitions[key].title,
          'labels': [
            self.QuestionDefinitions[key].answers[0].title,
            self.QuestionDefinitions[key].answers[1].title
          ],
          'values': [{
            'label': 'average response',
            'value-pct': 100 * ((self.SurveyAverageValues[key] - 1) / (self.QuestionDefinitions[key].scale_max - 1))
          }]
        })
      })
  } else {
    domg_data = this.ProvidedSurveyValues
  }

  var d = new VTA.domg({
    data: domg_data,
    target: this.results_wrapper[0],
    display_type: 'marker',
    alternate: true
  })
}

// FIXME: hack!
VTA.Survey.NULL_ANSWER_PK = 38

/*
 * @constructor
 * @param s_args = { form_elem : Element, survey_targets : { number|string : string }, results_elem : Element }
 */
VTA.Survey.Controller = function (s_args) {
  /* s_args might look like this:
    {
        form_elem : document.getElementById('main_form'),
        survey_targets : { 2 : '#survey_wrapper', 1 : '#demographics_wrapper'},
        results_elem : document.getElementById('results_wrapper')
    }
  */
  var self = this

  this.SURVEY_API = VTA.Survey.SERVER
  this.survey_targets = s_args['survey_targets']

  this.survey_ids = Object.keys(this.survey_targets)

  this.QuestionDefinitions = {}
  this.user_response = []
  this.sessionid = null
  this.csrftoken = null

  this.submit_redirect = s_args['submit_redirect'] === 'undefined' ? null : s_args['submit_redirect']
  this.questions_wrapper = null
  this.$main_form = $(s_args['form_elem'])
  this.results_wrapper = s_args['results_elem']
  this.survey_sections = []
  // this.done_callbacks = []
  // for (var i = 0; i < this.survey_ids.length; i++) {
  //  var cb = s_args.survey_targets[this.survey_ids[i]].doneCallback || function () { console.log('done callback') }
  //  this.done_callbacks.push(cb)
  // }

}

VTA.Survey.Controller.prototype.init = function () {
  var self = this

  this.$main_form.on('submit', function (event) {
    event.preventDefault()
    self.ok()
  })

  for (var i = 0; i < this.survey_ids.length; i++) {
    if (isNaN(parseInt(this.survey_ids[i], 10))) {
      window.console.log('Invalid survey ID: it must be an integer.')
      continue
    }

    // clear the target, remove any loading text/images
    $(this.survey_targets[this.survey_ids[i]]['target_elem']).empty()
    var section_elem = $('<ol id=survey_' + this.survey_ids[i] + '/>')
      .addClass('questions_wrapper')
      .appendTo(this.survey_targets[this.survey_ids[i]]['target_elem'])
    this.survey_targets[this.survey_ids[i]].section_elem = section_elem

    window.console.log('Fetching survey data for lanuage:', VTA.user_language)
    $.ajax({
      url: this.SURVEY_API + '/surveys/' + this.survey_ids[i] + '/?language=' + VTA.user_language,
      headers: {
        'Accept-Language': VTA.user_language
      }
    })
      .error(function (jqXHR, textStatus, errorThrown) {
        window.console.log('failed to get survey questions', jqXHR, textStatus, errorThrown)
        if (jqXHR.status === 500) {
          // window.console.log('trying English language')
          // VTA.user_language = 'en-us'
          if (!VTA.Countdown.exhausted()) {
            VTA.Countdown.decrement()
            self.init()
          }
        }
      })
      .done(function (response, textStatus, jqXHR) {
        VTA.Countdown.reset()
        // window.console.log('csrftoken : ' + VTA.util.getCookie(response, 'csrftoken'))
        // window.console.log('sessionid : ' + VTA.util.getCookie(response, 'sessionid'))

        // set this once! These should match across survey responses when the survey is sent back to the server.
        self.sessionid = response.sessionid
        self.csrftoken = response.csrftoken
        VTA.global.sessionids.push(response.sessionid)

        response.questions = response.questions.sort(function (a, b) {
          return a.position > b.position ? 1 : -1
        })
        var survey_id = response['pk']
        var elem = self.survey_targets[survey_id].section_elem
        var cb = self.survey_targets[survey_id].doneCallback || function () { console.log('done callback') }
        self.survey_sections.push(new VTA.Survey.Section(elem, survey_id, response['questions'], self.survey_targets[survey_id], cb))

        self.QuestionDefinitions[response['pk']] = {}
        for (var k = 0; k < response['questions'].length; k++) {
          self.QuestionDefinitions[survey_id][response['questions'][k]['pk']] = response['questions'][k]
        }

        $('input[type="range"]')
          .rangeslider({
            polyfill: false
          })

        $('.selectpicker')
          .selectpicker({
            style: 'btn-info',
            size: false
          })

      // for (var cbi = 0; cbi < self.done_callbacks.length; cbi++) {
      //  self.done_callbacks[cbi]()
      // }
      })
  }
}

VTA.Survey.Controller.prototype.getFormResults = function (formElement) {
  var formElements = formElement[0].elements
  user_response = {}
  var i = 0
  var elem = null
  for (i = 0; i < formElements.length; i += 1) {
    elem = formElements[i]
    // window.console.log(elem, elem.type)
    if (!elem.name || elem.name.length < 1)
      continue
    var survey_id = $(elem)
      .data('survey-id')
    var q = this.QuestionDefinitions[survey_id][elem.name]
    user_response[survey_id] = user_response[survey_id] || []
    var include_this_response = false
    var res = {
      'question': q['pk'],
      'session_id': VTA.global.sessionids[0]
    }
    switch (elem.type) {
      case 'submit':
        break
      case 'radio':
        if (elem.checked) {
          res['answer'] = elem.value
          include_this_response = true
        }
        break
      case 'checkbox':
        if (elem.checked) {
          res['answer'] = q.answers[0]['pk']
          include_this_response = true
        }
        break
      case 'range':
        var answer = q.answers[0]['pk']

        if (VTA.util.normalize(q.scale_min, q.scale_max, parseInt(elem.value, 10)) < .5) {
          // the slider is closer to the left value than the right
          answer = q.answers[1]['pk']
        }
        res['answer'] = answer
        if (!VTA.util.stringisNullOrWhitespace(elem.value)) {
          res['other_answer_numeric'] = elem.value
        }
        include_this_response = true
        break
      case 'text':
        res['answer'] = VTA.Survey.NULL_ANSWER_PK
        if (!VTA.util.stringisNullOrWhitespace(elem.value)) {
          res['other_answer_numeric'] = elem.value
          include_this_response = true
        }
        break
      case 'select-one':
        if (!VTA.util.stringisNullOrWhitespace(elem.value)) {
          res['answer'] = elem.value
          include_this_response = true
        }
        break
      default:
        res['answer'] = q.answers[0]['pk']
        res['other_answer'] = elem.value
        include_this_response = true
        break
    }
    if (include_this_response) {
      user_response[survey_id].push(res)
    }
  }
  return user_response
}

VTA.Survey.Controller.prototype.done = function (user_answers) {
  var self = this

  window.console.log('Session IDs', VTA.global.sessionids)

  for (var i = 0; i < this.survey_ids.length; i++) {
    var user_data = JSON.stringify(user_answers[this.survey_ids[i]], null, ' ')

    $.post(this.SURVEY_API + '/responses/', user_data)
      .done(function (data) {
        window.console.log('Received data from ' + data.length + ' survey responses.')
      })
  }

  if (this.submit_redirect) {
    window.location.href = this.submit_redirect
  }

  var domg_data = []
  var surveys_to_show = 0
  var have_results_for = 0
  var survey_ids = Object.keys(self.survey_targets)
  for (var i = 0; i < survey_ids.length; i++) {
    var survey_id = survey_ids[i]
    if (self.survey_targets[survey_id]['show_results']) {
      surveys_to_show = surveys_to_show + 1
      $.get(this.SURVEY_API + '/responses/' + survey_id + '/?output=average')
        .done(function (data) {
          have_results_for = have_results_for + 1

          self.SurveyAverageValues = data['averages']
          self.SurveyResponseCount = data['stats']['count']
          window.console.log('Received data from ' + self.SurveyResponseCount + ' survey responses.')

          var user_responses_indexed = {}
          for (var i = 0; i < user_answers[survey_id].length; i++) {
            user_responses_indexed[user_answers[survey_id][i]['question']] = parseInt(user_answers[survey_id][i]['other_answer_numeric'], 10)
          }

          var q_id = null
          for (var i = 0; i < user_answers[survey_id].length; i++) {
            q_id = user_answers[survey_id][i]['question']
            var min = self.QuestionDefinitions[survey_id][q_id]['scale_min']
            var max = self.QuestionDefinitions[survey_id][q_id]['scale_max']
            domg_data.push({
              'name': self.QuestionDefinitions[survey_id][q_id].title,
              'labels': [
                self.QuestionDefinitions[survey_id][q_id].answers[0].title,
                self.QuestionDefinitions[survey_id][q_id].answers[1].title
              ],
              'values': [{
                'label': 'average response',
                'value-pct': 100 * VTA.util.normalize(min, max, self.SurveyAverageValues[q_id])
              }, {
                'label': 'your response',
                'value-pct': 100 * VTA.util.normalize(min, max, user_responses_indexed[q_id])
              }]
            })
          }
          if (have_results_for === surveys_to_show) {
            var d = new VTA.domg({
              data: domg_data,
              target: self.results_wrapper,
              display_type: 'marker',
              alternate: true
            })
          }
        })
    }
  }
}

VTA.Survey.Controller.prototype.ok = function () {
  this.$main_form.find(':submit')
    .attr({
      disabled: true
    })
  var postData = this.getFormResults(this.$main_form)

  window.console.log(postData)

  if (this.$main_form[0].checkValidity()) {
    this.done(postData)
  }
}

/*
 * @constructor
 */
VTA.Survey.Section = function (section_elem, section_id, quesiton_definitions, opt_args, callback) {
  this.questions_wrapper = $(section_elem)
  this.QuestionDefinitions = {}
  this.section_id = section_id
  this.answer_index = 0
  this.question_index = 0
  this.opt_args = opt_args
  this.done_callback = callback

  var self = this
  quesiton_definitions.forEach(function (e) {
    self.QuestionDefinitions[e['pk']] = e
    var type = e.type
    if (type === 'radio') {
      self.addRadioQuestion(e)
    } else if (type === 'range') {
      self.addRangeQuestion(e)
    } else if (type === 'checkbox') {
      self.addCheckboxQuestion(e)
    } else if (type === 'dropdown') {
      self.addDropdownQuestion(e)
    } else if (type === 'text' || type === 'zipcode') {
      self.addTextQuestion(e)
    }
  })
  this.done_callback()
}

VTA.Survey.Section.prototype.addRadioQuestion = function (o) {
  var qid = o.pk
  var question = o.title
  var question_content = o.content
  var answers = o.answers
  var required = o['required']
  var self = this
  if (answers.length < 2) {
    window.console.warn('Malformed question: need at least two answers to a "radio" question.', o)
    return
  }
  var $frag = $(document.createDocumentFragment())
  var $q_wrapper = $('<li class="question radio"/>')

  $('<p>')
    .addClass('question_title')
    .text(question)
    .appendTo($frag)
  $('<p>')
    .addClass('question_content')
    .html(question_content)
    .appendTo($frag)

  answers = answers.sort(function (a, b) {
    return a['position'] > b['position'] ? 1 : -1
  })

  answers.forEach(function (ans) {
    var meta_int = parseInt(ans['meta_integer'])
    var subtitle = ans['subtitle'] || null

    var $a_wrapper = $('<span/>')
      .addClass('answer_wrapper')
      .appendTo($q_wrapper)
    $('<input type="radio"/>')
      .attr({
        id: 's' + self.section_id + '_a_' + self.answer_index,
        name: qid,
        required: required,
        value: ans['pk'],
        'data-survey-id': self.section_id,
        'data-meta-integer': meta_int
      })
      .appendTo($a_wrapper)

    var label_html = '<div class="answer_title_wrapper"><span class="answer_title">' + ans['title'] + '</span>'
    if (subtitle) {
      label_html += '<span class="answer_subtitle">' + subtitle + '</span>'
    }
    label_html += '</div>'

    $('<label/>')
      .attr({
        for: 's' + self.section_id + '_a_' + self.answer_index
      })
      .html(label_html)
      .appendTo($a_wrapper)

    $a_wrapper.on('click', function (e) {
      $q_wrapper.find('.answer_wrapper').each(function (index, element) {
        $(element).removeClass('checked')
      })
      var $this = $(this)
      if ($this.find('input')[0].checked) {
        $this.addClass('checked')
      }
    })

    self.answer_index += 1
  })

  this.question_index += 1
  $q_wrapper.appendTo($frag)
  $frag.appendTo(this.questions_wrapper)
}

VTA.Survey.Section.prototype.addTextQuestion = function (o) {
  var qid = o.pk
  var question = o.title
  var answers = o.answers
  var type = o.type
  var self = this

  var $frag = $(document.createDocumentFragment())
  var $q_wrapper = $('<li class="question text"/>')

  $('<label/>')
    .attr({
      for: 's' + self.section_id + '_a_' + this.answer_index
    })
    .text(question)
    .appendTo($q_wrapper)

  var $select = null
  if (type === 'zipcode') {
    $select = $('<input type="text"/>')
      .attr({
        name: qid,
        type: 'number',
        pattern: '[0-9]*',
        maxlength: '5',
        min: '0',
        id: 's' + self.section_id + '_a_' + self.answer_index,
        'data-survey-id': self.section_id
      })
      .appendTo($q_wrapper)
  } else {
    $select = $('<input type="text"/>')
      .attr({
        name: qid,
        'data-survey-id': self.section_id,
        id: 's' + self.section_id + '_a_' + self.answer_index
      })
      .appendTo($q_wrapper)
  }

  this.question_index += 1
  $frag.append($q_wrapper)
  $frag.appendTo(this.questions_wrapper)
}

VTA.Survey.Section.prototype.addDropdownQuestion = function (o) {
  var qid = o.pk
  var question = o.title
  var answers = o.answers
  var self = this
  if (answers.length < 2) {
    window.console.warn('Malformed question: need at least two answers to a "dropdown" question.', o)
    return
  }
  var $frag = $(document.createDocumentFragment())
  var $q_wrapper = $('<li class="question dropdown"/>')
    .appendTo($frag)

  var $select = $('<select/>')
    .attr({
      name: qid,
      'data-survey-id': self.section_id,
      title: question
    })
    .addClass('selectpicker')
    .appendTo($q_wrapper)

  answers.forEach(function (ans) {
    $('<option/>')
      .attr({
        value: ans['pk']
      })
      .text(ans['title'])
      .appendTo($select)

    self.answer_index += 1
  })

  this.question_index += 1
  $frag.appendTo(this.questions_wrapper)
}

VTA.Survey.Section.prototype.addCheckboxQuestion = function (o) {
  var qid = o.pk
  var question = o.title
  var answers = o.answers
  var self = this
  if (answers.length < 0) {
    window.console.warn('Malformed question: need at least one answer to a "checkbox" question.', o)
    return
  }

  var $frag = $(document.createDocumentFragment())
  var $q_wrapper = $('<li class="question checkbox"/>')

  $('<p>')
    .text(question)
    .appendTo($frag)

  answers.forEach(function (ans) {
    $('<input type="checkbox"/>')
      .attr({
        id: 's' + self.section_id + '_a_' + self.answer_index,
        name: qid,
        value: ans['choice_text'],
        'data-survey-id': self.section_id
      })
      .appendTo(self.$q_wrapper)

    $('<label/>')
      .attr({
        for: 's' + self.section_id + '_a_' + self.answer_index
      })
      .text(ans['choice_text'])
      .appendTo($q_wrapper)

    self.answer_index += 1
  })
  this.question_index += 1

  $frag.append($q_wrapper)
  $frag.appendTo(this.questions_wrapper)
}

VTA.Survey.Section.prototype.addRangeQuestion = function (o) {
  var qid = o.pk
  var question = o.title
  var answers = o.answers
  var input_vals = {
    'min': o.scale_min,
    'max': o.scale_max,
    'step': 1
  }

  if (answers.length !== 2) {
    window.console.warn('Malformed question: need two and only two answers for a "range" question.', o)
    return
  }

  var $frag = $(document.createDocumentFragment())

  var $q_wrapper = $('<li class="question range"/>')

  $('<span class="question_index">')
    .text(this.question_index + 1)
    .appendTo($q_wrapper)

  $('<label>')
    .attr({
      for: 's' + this.section_id + '_a_' + this.answer_index
    })
    .text(question)
    .appendTo($q_wrapper)

  var $input_wrapper = $('<div class="input_wrapper"/>')
    .appendTo($q_wrapper)

  var dl_id = 'q_' + this.question_index + '_dl'
  $('<input type="range"/>')
    .attr({
      id: 's' + this.section_id + '_a_' + self.answer_index,
      name: qid,
      required: true,
      list: dl_id,
      min: input_vals.min,
      max: input_vals.max,
      step: input_vals.step,
      value: input_vals.min + (input_vals.max - input_vals.min) / 2,
      'data-survey-id': this.section_id
    })
    .appendTo($input_wrapper)

  if (this.opt_args['center_tick']) {
    console.log('trying to find the middle value between ' + answers[0].title + ' and ' + answers[1].title)
    // var val1 = parseInt((answers[0].title.match(/\d+/))[0], 10)
    // var val2 = parseInt((answers[1].title.match(/\d+/))[0], 10)
    // var middle_val = Math.abs(val1-val2)/2 +Math.min(val1, val2)
    // var middle_text = answers[0].title.replace(val1, middle_val)
    var middle_text = VTA.util.muxText(answers[0].title, answers[1].title)

    var $left_option = $('<div>')
      .addClass('thirds')
      .addClass('left')
      .html(answers[0].title)
    var $center_option = $('<div>')
      .addClass('thirds')
      .addClass('center')
      .html(middle_text)
    var $right_option = $('<div>')
      .addClass('thirds')
      .addClass('right')
      .html(answers[1].title)
    $left_option.appendTo($input_wrapper)
    $center_option.appendTo($input_wrapper)
    $right_option.appendTo($input_wrapper)
  } else {
    var $left_option = $('<div>')
      .addClass('left')
      .html(answers[0].title)
    var $right_option = $('<div>')
      .addClass('right')
      .html(answers[1].title)
    $left_option.appendTo($input_wrapper)
    $right_option.appendTo($input_wrapper)
  }

  this.answer_index += 1
  this.question_index += 1

  $frag.append($q_wrapper)
  $frag.appendTo(this.questions_wrapper)
}

/**
 * author: Michael J. I. Jackson
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv (r, g, b) {
  r = r / 255, g = g / 255, b = b / 255
  var max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  var h, s, v = max

  var d = max - min
  s = max == 0 ? 0 : d / max

  if (max == min) {
    h = 0 // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h, s, v]
}

/**
 * author: Michael J. I. Jackson
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb (h, s, v) {
  var r, g, b

  var i = Math.floor(h * 6)
  var f = h * 6 - i
  var p = v * (1 - s)
  var q = v * (1 - f * s)
  var t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0:
      r = v, g = t, b = p
      break
    case 1:
      r = q, g = v, b = p
      break
    case 2:
      r = p, g = v, b = t
      break
    case 3:
      r = p, g = q, b = v
      break
    case 4:
      r = t, g = p, b = v
      break
    case 5:
      r = v, g = p, b = q
      break
  }

  return [r * 255, g * 255, b * 255]
}

(function (window) {
  // This library re-implements setTimeout, setInterval, clearTimeout, clearInterval for iOS6.
  // iOS6 suffers from a bug that kills timers that are created while a page is scrolling.
  // This library fixes that problem by recreating timers after scrolling finishes (with interval correction).
  // This code is free to use by anyone (MIT, blabla).
  // Original Author: rkorving@wizcorp.jp
  var timeouts = {}
  var intervals = {}
  var orgSetTimeout = window.setTimeout
  var orgSetInterval = window.setInterval
  var orgClearTimeout = window.clearTimeout
  var orgClearInterval = window.clearInterval
  // To prevent errors if loaded on older IE.
  if (!window.addEventListener) return false
  // This fix needs only for iOS 6.0 or 6.0.1, continue process if the version matched.
  if (!navigator.userAgent.match(/OS\s6_0/)) return false
  function createTimer (set, map, args) {
    var id, cb = args[0],
      repeat = (set === orgSetInterval)

    function callback () {
      if (cb) {
        cb.apply(window, arguments)
        if (!repeat) {
          delete map[id]
          cb = null
        }
      }
    }
    args[0] = callback
    id = set.apply(window, args)
    map[id] = {
      args: args,
      created: Date.now(),
      cb: cb,
      id: id
    }
    return id
  }

  function resetTimer (set, clear, map, virtualId, correctInterval) {
    var timer = map[virtualId]
    if (!timer) {
      return
    }
    var repeat = (set === orgSetInterval)
    // cleanup
    clear(timer.id)
    // reduce the interval (arg 1 in the args array)
    if (!repeat) {
      var interval = timer.args[1]
      var reduction = Date.now() - timer.created
      if (reduction < 0) {
        reduction = 0
      }
      interval -= reduction
      if (interval < 0) {
        interval = 0
      }
      timer.args[1] = interval
    }
    // recreate
    function callback () {
      if (timer.cb) {
        timer.cb.apply(window, arguments)
        if (!repeat) {
          delete map[virtualId]
          timer.cb = null
        }
      }
    }
    timer.args[0] = callback
    timer.created = Date.now()
    timer.id = set.apply(window, timer.args)
  }
  window.setTimeout = function () {
    return createTimer(orgSetTimeout, timeouts, arguments)
  }
  window.setInterval = function () {
    return createTimer(orgSetInterval, intervals, arguments)
  }
  window.clearTimeout = function (id) {
    var timer = timeouts[id]
    if (timer) {
      delete timeouts[id]
      orgClearTimeout(timer.id)
    }
  }
  window.clearInterval = function (id) {
    var timer = intervals[id]
    if (timer) {
      delete intervals[id]
      orgClearInterval(timer.id)
    }
  }
  // check and add listener on the top window if loaded on frameset/iframe
  var win = window
  while (win.location != win.parent.location) {
    win = win.parent
  }
  win.addEventListener('scroll', function () {
    // recreate the timers using adjusted intervals
    // we cannot know how long the scroll-freeze lasted, so we cannot take that into account
    var virtualId
    for (virtualId in timeouts) {
      resetTimer(orgSetTimeout, orgClearTimeout, timeouts, virtualId)
    }
    for (virtualId in intervals) {
      resetTimer(orgSetInterval, orgClearInterval, intervals, virtualId)
    }
  })
}(window))
