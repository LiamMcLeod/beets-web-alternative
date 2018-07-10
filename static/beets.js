// Format times as minutes and seconds.
var timeFormat = function (secs) {
    if (secs == undefined || isNaN(secs)) {
        return '0:00';
    }
    secs = Math.round(secs);
    var mins = '' + Math.floor(secs / 60);
    secs = '' + (secs % 60);
    if (secs.length < 2) {
        secs = '0' + secs;
    }
    return mins + ':' + secs;
}

// jQuery extension encapsulating event hookups for audio element controls.
$.fn.player = function (debug) {
    // Selected element should contain an HTML5 Audio element.
    var audio = $('audio', this).get(0);

    // Control elements that may be present, identified by class.
    var playBtn = $('#btnPlay', this);
    var pauseBtn = $('#btnPause', this);
    // Extra buttons 
    var previousBtn = $('#btnPrevious', this);
    var nextBtn = $('#btnNext', this);


    var disabledInd = $('.disabled', this);
    var timesEl = $('.times', this);
    var curTimeEl = $('.currentTime', this);
    var totalTimeEl = $('.totalTime', this);
    var sliderPlayedEl = $('.slider .played', this);
    var sliderLoadedEl = $('.slider .loaded', this);

    //Volume Slider
    var sliderVolume = player.querySelector('#volumeSlider')
    sliderVolume.addEventListener('change', volumeChange, false);

    //Seek Slider
    var sliderSeek = player.querySelector('#seekSlider')
    sliderSeek.addEventListener('input', sliderSeeking, false);
    sliderSeek.addEventListener('change', sliderReleased, false);

    // Button events.
    playBtn.click(function () {
        audio.play();
    });
    pauseBtn.click(function (ev) {
        audio.pause();
    });

    // Slider Events
    function volumeChange() {
        audio.volume = sliderVolume.value;
    }

    function updateSlider() {
        sliderSeek.value = audio.currentTime
    }

    function resetSlider() {
        sliderSeek.value = 0;
    }

    function sliderSeeking() {
        //Variable to stop instant paly
        audioIsPaused = audio.paused;
        // Pause while it evaluates the times
        audio.pause();
        // audio time to slider time
        audio.currentTime = sliderSeek.value
    }

    // TODOS
    // Maybe Migrate to Vue
    // Fix seeker
    // Now playing range bar too quick
    //? References
    // https://www.w3schools.com/tags/ref_eventattributes.asp
    // https://www.w3schools.com/tags/ref_av_dom.asp
    // https://www.w3schools.com/html/html5_audio.asp

    function sliderReleased() {
        // Start playing again based on if it was already playing
        if (!audioIsPaused) {
            audio.play();
        }
    }

    // Utilities.
    var timePercent = function (cur, total) {
        if (cur == undefined || isNaN(cur) ||
            total == undefined || isNaN(total) || total == 0) {
            return 0;
        }
        var ratio = cur / total;
        if (ratio > 1.0) {
            ratio = 1.0;
        }
        return (Math.round(ratio * 10000) / 100) + '%';
    }

    // Event helpers.
    var dbg = function (msg) {
        if (debug)
            console.log(msg);
    }
    var showState = function () {
        if (audio.duration == undefined || isNaN(audio.duration)) {
            playBtn.hide();
            pauseBtn.hide();
            disabledInd.show();
            timesEl.hide();
        } else if (audio.paused) {
            playBtn.show();
            pauseBtn.hide();
            disabledInd.hide();
            timesEl.show();
        } else {
            playBtn.hide();
            pauseBtn.show();
            // disabledInd.hide();
            timesEl.show();
        }
    }
    var showTimes = function () {
        curTimeEl.text(timeFormat(audio.currentTime));
        totalTimeEl.text(timeFormat(audio.duration));

        sliderPlayedEl.css('width',
            timePercent(audio.currentTime, audio.duration));

        // last time buffered
        var bufferEnd = 0;
        for (var i = 0; i < audio.buffered.length; ++i) {
            if (audio.buffered.end(i) > bufferEnd)
                bufferEnd = audio.buffered.end(i);
        }
        sliderLoadedEl.css('width',
            timePercent(bufferEnd, audio.duration));
    }

    // Initialize controls.
    showState();
    showTimes();

    // Bind events.
    $('audio', this).bind({
        playing: function () {
            dbg('playing');
            showState();
        },
        pause: function () {
            dbg('pause');
            showState();
        },
        ended: function () {
            dbg('ended');
            showState();
            // resetSlider();
        },
        progress: function () {
            dbg('progress ' + audio.buffered);
        },
        timeupdate: function () {
            dbg('timeupdate ' + audio.currentTime);
            showTimes();
            updateSlider();
        },
        durationchange: function () {
            dbg('durationchange ' + audio.duration);
            showState();
            showTimes();
        },
        loadeddata: function () {
            dbg('loadeddata');
        },
        loadedmetadata: function () {
            dbg('loadedmetadata');
        }
    });
}

// Simple selection disable for jQuery.
// Cut-and-paste from:
// http://stackoverflow.com/questions/2700000
$.fn.disableSelection = function () {
    $(this).attr('unselectable', 'on')
        .css('-moz-user-select', 'none')
        .each(function () {
            this.onselectstart = function () {
                return false;
            };
        });
};

//API Routing and stuff here
$(function () {

    // Routes.
    var BeetsRouter = Backbone.Router.extend({
        routes: {
            "search/:query": "itemQuery",
            "item/query/:query": "itemQuery",
            "": "itemQuery",
        },
        itemQuery: function (query) {
            if (query) {
                var queryURL = query.split(/\s+/).map(encodeURIComponent).join('/');
                $.getJSON('/item/query/' + queryURL, function (data) {
                    var models = _.map(
                        data['results'],
                        function (d) {
                            return new Item(d);
                        }
                    );
                    var results = new Items(models);
                    // console.log(results);
                    app.showItems(results);
                });
            } else {
                // Library Request
                /** Very janky method but fuck it it works
                 *  as /item returns a different model to expected */
                $.getJSON('/item/query/%20', function (data) {
                    var models = _.map(
                        data['results'],
                        function (d) {
                            return new Item(d);
                        });
                    var results = new Items(models);
                    results.query = false;
                    app.showItems(results);
                });
            }
        }
    });
    var router = new BeetsRouter();

    // Model.
    var Item = Backbone.Model.extend({
        urlRoot: 'item'
    });
    var Items = Backbone.Collection.extend({
        model: Item
    });
    // Test View 
    var NowPlayingView = Backbone.View.extend({
        tagName: "div",
        template: _.template($('#now-playing-template').html()),
        events: {
            'click .play': 'play',
        },
        render: function () {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        },
        play: function () {
            // app.playItem(this.model);
        }
    });
    // Item views.
    var ItemEntryView = Backbone.View.extend({
        tagName: "tr",
        template: _.template($('#item-entry-template').html()),
        events: {
            'click': 'select',
            'dblclick': 'play',
            'click .info': 'toggleModal',
        },
        initialize: function () {
            this.playing = false;
        },
        render: function () {
            $(this.el).html(this.template(this.model.toJSON()));
            this.setPlaying(this.playing);
            return this;
        },
        select: function () {
            app.selectItem(this);
        },
        play: function () {
            app.playItem(this.model);
        },
        setPlaying: function (val) {
            this.playing = val;
            if (val)
                this.$('.playing').show();
            else
                this.$('.playing').hide();
        },
        toggleModal: function () {
            app.toggleMainDetailView();
        }
    });
    //Holds Title, Artist, Album etc.
    var ItemMainDetailView = Backbone.View.extend({
        tagName: "div",
        template: _.template($('#item-main-detail-template').html()),
        events: {
            'click .play': 'play',
            'click .close': 'close',
            'click .modal-overlay': 'close'
        },
        render: function (playing) {
            if (playing){
                //todo display now playing instead
                // $(this.el).html(this.template(this.model.toJSON()));
            } else {
                $(this.el).html(this.template(this.model.toJSON()));
            }
            return this;
        },
        play: function () {
            app.playItem(this.model);
        },
        close: function () {
            //todo fix playback stops when modal is closed
            app.toggleMainDetailView();
        }
    });
    // Holds Track no., Format, MusicBrainz link, Lyrics, Comments etc.
    var ItemExtraDetailView = Backbone.View.extend({
        // do something about this mess of text formatting
        tagName: "div",
        template: _.template($('#item-extra-detail-template').html()),
        render: function () {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        }
    });
    // Main app view.
    // todo events for tabs
    var AppView = Backbone.View.extend({
        el: $('body'),
        events: {
            'submit #queryForm': 'querySubmit',
            'click #library-tab': 'querySubmit',
            'click #search-tab': 'querySubmit',
            'click #searchButton': 'querySubmit',
            'click #playing-tab': 'toggleMainDetailView'
        },
        querySubmit: function (ev) {
            ev.preventDefault();
            if (ev.currentTarget.id=='library-tab'){

                router.navigate('', true);

                $('#search-tab').removeClass('active');
                $('#library-tab').addClass('active');
                // $('#search-view').removeAttr('hidden')    
            } else {
                router.navigate('search/' + encodeURIComponent($('#query').val()), true);

                $('#library-tab').removeClass('active');
                $('#search-tab').addClass('active');
                $('#search-view').removeAttr('hidden')
            }
        },
        initialize: function () {
            this.playingItem = null;
            this.shownItems = null;

            // Not sure why these events won't bind automatically.
            this.$('audio').bind({
                'play': _.bind(this.audioPlay, this),
                'pause': _.bind(this.audioPause, this),
                'ended': _.bind(this.audioEnded, this)
            });
        },
        showItems: function (items) {
            this.shownItems = items;
            $('#results').empty();
            items.each(function (item) {
                var view = new ItemEntryView({
                    model: item
                });
                item.entryView = view;
                $('#results').append(view.render().el);
                $('#search-view').removeAttr('hidden');
            });
        },
        selectItem: function (view) {
            // Mark row as selected.
            $('#results tr').removeClass("selected");
            if (!$('#results tr').hasClass("selected")) {
                $('td button').addClass('hidden');
            }

            $(view.el).addClass("selected");
            // move this to a button.
            //Modal activate
            $('.selected td button').removeClass('hidden');

            // Show main and extra detail.
            var mainDetailView = new ItemMainDetailView({
                model: view.model
            });
            $('#main-detail').empty().append(mainDetailView.render().el);

            var extraDetailView = new ItemExtraDetailView({
                model: view.model
            });
            $('#extra-detail').empty().append(extraDetailView.render().el);
        },
        toggleMainDetailView: function (e) {
            if (e){
                    e.preventDefault();
                    var modal = $('#main-detail-modal');
                    if (e.currentTarget.id=='playing-tab'){
                        // todo load other data
                        // var mainDetailView = new ItemMainDetailView({
                        //     model: view.model
                        // });
                        // $('#main-detail').empty().append(mainDetailView.render(true).el);

                        if (modal.hasClass('active')) {
                            modal.removeClass('active');
                        } else {
                            modal.addClass('active');
                        }
                    }
            } else {
                var modal = $('#main-detail-modal');
                if (modal.hasClass('active')) {
                    modal.removeClass('active');
                } else {
                    modal.addClass('active');
                }
            }
        },
        playItem: function (item) {
            // console.log(item);
            var url = 'item/' + item.get('id') + '/file';
            $('#player audio').attr('src', url);
            // Controls playback
            $('#player audio').get(0).play();
            if (this.playingItem != null) {
                this.playingItem.entryView.setPlaying(false);
            }
            item.entryView.setPlaying(true);
            this.playingItem = item;
            //TODO Build the template here
            this.nowPlaying(item);
        },
        audioPause: function () {
            this.playingItem.entryView.setPlaying(false);
        },
        audioPlay: function () {
            if (this.playingItem != null)
                this.playingItem.entryView.setPlaying(true);
        },
        audioEnded: function () {
            this.playingItem.entryView.setPlaying(false);

            // Try to play the next track.
            var idx = this.shownItems.indexOf(this.playingItem);
            if (idx == -1) {
                // Not in current list.
                return;
            }
            var nextIdx = idx + 1;
            if (nextIdx >= this.shownItems.size()) {
                // End of  list.
                return;
            }
            this.playItem(this.shownItems.at(nextIdx));
        },
        nowPlaying: function (item) {
            $('#moreButton').removeClass('hidden');
                    // Show main and extra detail.
            //todo start making an object that has all the things I want rendered
            var view = new NowPlayingView({
                model: item
            });
            console.log(view);
            $('#more-panel-detail').empty().append(view.render().el);
        },
    });
    var app = new AppView();

    // App setup.
    Backbone.history.start({
        root: '/',
        pushState: true
    });


    // Disable selection on UI elements.
    $('#entities ul').disableSelection();
    $('#header').disableSelection();

    // Audio player setup.
    $('#player').player();

});

// Open the sidenav
function openNav() {
    $('#more-panel').css({'height': '100%'});
    $('#moreButton').addClass('hidden');
    $('#nomoreButton').removeClass('hidden');
}

// Close/hide the botnav
function closeNav() {
    $('#more-panel').css({'height': '0'});
    $('#moreButton').removeClass('hidden');
    $('#nomoreButton').addClass('hidden');
}
