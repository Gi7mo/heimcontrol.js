require(["jquery", "bootstrap.min", "/socket.io/socket.io.js"], function() {

  var socket = io.connect();

  require(["plugins", "/js/d3.v3.min.js"], function(p, d3) {

    // Delete buttons
    function iDelete() {
      var e = $('#' + $(this).attr('data-delete'));
      e.slideToggle(500, function() {
        e.remove();
      });
    }
    $('.delete').unbind('click', iDelete);
    $('.delete').bind('click', iDelete);

    // Mac address to uppercase
    function iMac() {
      var e = $(this);
      var value = e.val();
      value = value.toUpperCase();
      value = value.replace('-', ':').replace('.', ':');
      e.val(value);
    }
    $('.mac').unbind('keyup', iMac);
    $('.mac').bind('keyup', iMac);

    // Uppercase
    function iUppercase() {
      var e = $(this);
      var value = e.val();
      value = value.toUpperCase();
      e.val(value);
    }
    $('.uppercase').unbind('keyup', iUppercase);    
    $('.uppercase').bind('keyup', iUppercase);

    // Socket buttons
    function iSocketButton() {
      var e = $(this);
      var data = {
          id: e.data('id'),
          value: e.data('value')
      };
      socket.emit(e.data('socket'), data);
    }
    $('.socket').unbind('click', iSocketButton);
    $('.socket').bind('click', iSocketButton);

    function registerSelectSwitch() {
      $('.switch select').change(function() {
        var e = $(this).parents('.switch');
        e.find('.switch-container').find('div').addClass('hidden');
        e.find('.switch-container').find('input').val('');
        e.find('.switch-container').find('input').removeAttr('required', '0');
        e.find('.switch-container').find('.' + $(this).val()).each(function() {
          var e = $(this);
          e.removeClass('hidden');
          if (e.attr('data-required')=='1') {
            e.attr('required', 'required');
          }
        });
      });
    };
    registerSelectSwitch();

    if ($('#template').length) {
      $('.add').click(function() {

        // Get current iterator
        var i = $('#iterator').val();
        
        // Clone element
        var element = $('#template').clone();
        $('#' + $(this).data('target')).append(element);
        
        // Set ids
        element.attr('id', i);
        
        element.find('input, select').each(function() {
          $(this).attr('name', $(this).attr('name').replace('%i%', i));
        });
        
        element.find('.delete').attr('data-delete', i);
        
        // Fade in
        element.slideToggle();
        $('html, body').animate({
          scrollTop : $('html, body').height()
        }, 800);
        
        // Call callback
        if ($(this).attr('data-callback')) {
          try {
            eval($(this).attr('data-callback'));
          } catch (e) {
            alert('JavaScript Error: Callback function not found [' + $(this).attr('data-callback') + '].');
          }
        }
        
        // Unbind Events
        $('.delete').unbind('click', iDelete);
        $('.uppercase').unbind('keyup', iUppercase);    
        $('.mac').unbind('keyup', iMac);

        // Bind Events
        $('.delete').bind('click', iDelete);
        $('.uppercase').bind('keyup', iUppercase);
        $('.mac').bind('keyup', iMac);

        // Set new iterator
        $('#iterator').val(++i);
      });
    }
    
    // Socket disconnect
    socket.on('disconnect', function () {
      setTimeout(function() {
        $('.navigation').remove();
        $('#content').empty();
        $('#content').append('<h1>503</h1><h2>I\'m sorry Dave, i\'m afraid i have lost the connection to the server.</h2><p><a href="/login"><h3>Back to Login</h3></a></p>');
      }, 15000);
    });

    // Set login cookie
    require(["/js/jquery.cookie.js"], function() {
      if($('.btn-login').length > 0) {
        $('.btn-login').click(function() {
          if($('#rememberme').is(':checked')) {
            $.cookie("email", $('#email').val());
            $.cookie("password", $('#password').val());
          } else {
            $.cookie("email", null);
            $.cookie("password", null);
          }
        });
        $('#email').focus();
      }
      if($('.login-error').length > 0) {
        $.cookie("email", null);
        $.cookie("password", null);
      }
      if($('.btn-logout').length > 0) {
        $('.btn-logout').click(function() {
          $.cookie("email", null);
          $.cookie("password", null);
        });
      }
    });

    var $graph_overlay_wrapper;
    var $graph_overlay_panel;

    function show_graph_overlay(url) {
        if ( !$graph_overlay_wrapper ) append_graph_overlay();
        $graph_overlay_panel.html('<p class="icon-spinner icon-spin"></p>');
        $graph_overlay_wrapper.fadeIn(700);
        create_overlay_graph(url);
    }

    function create_overlay_graph(url) {
      var margin = {top: 20, right: 20, bottom: 30, left: 50},
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

      var parseDate = d3.time.format("%a %b %e %Y %X GMT%Z (CET)").parse;

      var x = d3.time.scale()
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left");

      var line = d3.svg.line()
          .interpolate("basis")
          .x(function(d) { return x(d.date); })
          .y(function(d) { return y(d.v); });

      $.get(url, function(data) {
        $graph_overlay_panel.html('');

        var svg = d3.select("#graph-overlay-panel").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        $graph_overlay_panel.width(width + (margin.left * 2) + (margin.right * 2));
        for(var i in data) {
          data[i].date = new Date(Date.parse(data[i].now));
        }
        
        x.domain([data[0].date, data[data.length - 1].date]);
        y.domain([0, d3.max(data, function(d) { return d.v; })]);

        svg.append("clipPath")
            .attr("id", "clip-above")
          .append("rect")
            .attr("width", width)
            .attr("height", y(0));

        svg.append("clipPath")
            .attr("id", "clip-below")
          .append("rect")
            .attr("y", y(0))
            .attr("width", width)
            .attr("height", height - y(0));

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Value");

        svg.selectAll(".line")
            .data(["above", "below"])
          .enter().append("path")
            .attr("class", function(d) { return "line " + d; })
            .attr("clip-path", function(d) { return "url(#clip-" + d + ")"; })
            .datum(data)
            .attr("d", line);
      });
    }

    function hide_graph_overlay() {
        $graph_overlay_wrapper.fadeOut(500);
    }

    function append_graph_overlay() {
        $graph_overlay_wrapper = $('<div id="graph-overlay"></div>').appendTo( $('BODY') );
        $graph_overlay_panel = $('<div id="graph-overlay-panel"></div>').appendTo( $graph_overlay_wrapper );

        attach_graph_overlay_events();
    }

    function attach_graph_overlay_events() {
        $(window).keydown(function(e) {
          if(e.which == 27) {
            e.stopPropagation();
            hide_graph_overlay();
          }
        });
        $(window).click(function(e) {
          hide_graph_overlay();
        });
    }

    $(function() {
        $('A.show-graph-overlay').click( function(e, a) {
            e.stopPropagation();
            show_graph_overlay(this.getAttribute('data-url'));
        });
    });

  });
});