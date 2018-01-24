var map;
var largeInfoWindow;
var bounds;


var viewModel = function () {
    var self = this;

    self.sidebarSize = ko.observable('30%');
    self.mapSize = ko.observable('80%');
    self.contentVisible = ko.observable(true);

    self.toggleSidebar = function() {
        if(self.sidebarSize() === '30%') {
            console.log('change small');
            self.sidebarSize('5%');
            self.mapSize('95%');
            self.contentVisible(false);
        } else {
            self.sidebarSize('30%');
            self.mapSize('80%');
            self.contentVisible(true);
        }
    };

    //create empty list for markers
    self.markers = ko.observableArray([]);

    //create list of location objects, all the stations on the yamanote line in Tokyo
    self.locations_ko = ko.observableArray([
        {title: 'Ikebukuro Station', location: {lat: 35.729729, lng: 139.711083}},
        {title: 'Mejiro Station', location: {lat: 35.72122, lng: 139.706612}},
        {title: 'Takadanobaba Station', location: {lat: 35.713447, lng: 139.704138}},
        {title: 'Shin-Okubo Station', location: {lat: 35.701301, lng: 139.700049}},
        {title: 'Shinjuku Station', location: {lat: 35.689407, lng: 139.700306}},
        {title: 'Yoyogi Station', location: {lat: 35.684106, lng: 139.702172}},
        {title: 'Harajuku Station', location: {lat: 35.670229, lng: 139.702698}},
        {title: 'Shibuya Station', location: {lat: 35.658034, lng: 139.701636}},
        {title: 'Ebisu Station', location: {lat: 35.647156, lng: 139.709739}},
        {title: 'Meguro Station', location: {lat: 35.633472, lng: 139.715586}},
        {title: 'Gotanda Station', location: {lat: 35.626159, lng: 139.723602}},
        {title: 'Osaki Station', location: {lat: 35.620023, lng: 139.728188}},
        {title: 'Shinagawa Station', location: {lat: 35.628471, lng: 139.73876}},
        {title: 'Tamachi Station', location: {lat: 35.645508, lng: 139.747825}},
        {title: 'Hamamatsucho Station', location: {lat: 35.655381, lng: 139.757129}},
        {title: 'Shimbashi Station', location: {lat: 35.666193, lng: 139.758332}},
        {title: 'Yurakucho Station', location: {lat: 35.674919, lng: 139.76282}},
        {title: 'Tokyo Station', location: {lat: 35.681167, lng: 139.767052}},
        {title: 'Kanda Station', location: {lat: 35.691822, lng: 139.770932}},
        {title: 'Akihabara Station', location: {lat: 35.698353, lng: 139.773114}},
        {title: 'Okachimachi Station', location: {lat: 35.707654, lng: 139.774805}},
        {title: 'Ueno Station', location: {lat: 35.712364, lng: 139.776188}},
        {title: 'Uguisudani Station', location: {lat: 35.721457, lng: 139.778013}},
        {title: 'Nippori Station', location: {lat: 35.728158, lng: 139.770641}},
        {title: 'Nishi-Nippori Station', location: {lat: 35.732006, lng: 139.766886}},
        {title: 'Tabata Station', location: {lat: 35.738365, lng: 139.760744}},
        {title: 'Komagome Station', location: {lat: 35.736567, lng: 139.74701}},
        {title: 'Sugamo Station', location: {lat: 35.733419, lng: 139.739285}},
        {title: 'Otsuka Station', location: {lat: 35.731785, lng: 139.728227}}
    ]);

    //Add each marker to the map based on locations in array
    for (var i = 0; i < self.locations_ko().length; i++) {
        var position  = self.locations_ko()[i].location;
        var title = self.locations_ko()[i].title;

        var marker = new google.maps.Marker({
            map: map,
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            id: i
        });

        self.markers.push(marker);
        bounds.extend(marker.position);

        //Add listener to markers to open info window on click
        /*jshint loopfunc: true */
        marker.addListener('click', function() {
            populateInfoWindow(this, largeInfoWindow);
        });

        //Add listener to markers to animate on click
        marker.addListener('click', function() {
            toggleBounce(this);
        });
    }

    //The search filter
    self.filter = ko.observable('');

    //Automatically filter the list of locations based on the filter query
    self.worker = ko.computed(function () {
        if (self.filter()) self.filteredItems();
    }, this);

    //Function to filter the markers list based on the users search query
    self.filteredItems = ko.computed(function () {
        if (!self.filter()) {
            for (var i = 0; i < self.markers().length; i++) {
                self.markers()[i].setMap(map);
            }
            return self.markers();
        } else {
            var filtered = ko.utils.arrayFilter(self.markers(), function (el) {
                if (el.title.toString().toLowerCase().indexOf(self.filter().toString().toLowerCase()) > -1) {
                    el.setMap(map);
                } else {
                    el.setMap(null);
                }
                return (el.title.toString().toLowerCase().indexOf(self.filter().toString().toLowerCase()) > -1);
            });
            return filtered;
        }
    });

    //Animate markers and open info window when a user clicks a location in sidebar
    self.clickLocation = function() {
        toggleBounce(this);
        populateInfoWindow(this, largeInfoWindow);
    };
};

//Animate the marker
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        //stop animation after 3 seconds
        window.setTimeout(function() {
            marker.setAnimation(null);
        }, 3000);
    }
}

//Create the info window on a marker
function populateInfoWindow(marker, infoWindow) {
    if(infoWindow.marker != marker) {
        infoWindow.marker = marker;
        infoWindow.setContent('');

        infoWindow.addListener('closeclick', function() {
            infoWindow.setContent(null);
        });
        getWikiData(marker.title, infoWindow);
        infoWindow.open(map, marker);
    }
}

//Get the first wikipeida article returned based on the location title
function getWikiData(query, infoWindow) {
    var wurl = "http://en.wikipedia.org/w/api.php";
    var wikiData = 'No wiki data found';

    $.ajax({
        url: wurl,
        data: {
            action: 'query',
            list: 'search',
            srsearch: query,
            format: 'json',
            formatversion: 2
        },
        dataType: 'jsonp',
        success: function (x) {
            var items = [];
            var count = 0;
            g = x.query.search;
            var now = new Date(Date.now());
            var citation = x.query.search[0].title + 'In Wikipedia. Retrieved ' + now + ", from https://en.wikipedia.org/wiki/"+x.query.search[0].title;
            wikiData = "<a href=https://en.wikipedia.org/wiki/"+x.query.search[0].title+">"+x.query.search[0].title+"</a><p>" + x.query.search[0].snippet + "</p></li><br><p>"+citation+"</p>";

            infoWindow.setContent(wikiData);
        }
    }).fail(function (jqXHR, textStatus) {
       wikiData = 'failed to get wikipedia resources';
       infoWindow.setContent(wikiData);
    });

    return false;
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 35.690202, lng: 139.716459},
        zoom: 12
    });

    bounds = new google.maps.LatLngBounds();

    largeInfoWindow = new google.maps.InfoWindow();

    var VM = new viewModel();
    ko.applyBindings(VM);
}

function mapError() {
    alert("Could not load map, plese try again later");
}