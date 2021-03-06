(function(context) {
  var dasherize = Polymer.CaseMap.camelToDashCase;

  var PolymerFire = {
    _origins: {},
    _originListeners: {},

    origin: function(url, name) {
      name = name || '_default';
      PolymerFire._origins[name] = url;
      var listeners = PolymerFire._originListeners[name];
      if (!listeners) {
        PolymerFire._originListeners[name] = [];
        return;
      }
      for (var i = 0; i < listeners.length; i++) {
        listeners[i]._firebase.updateUrl();
      }
    },
    Binding: {
      bindRef: function(ref, options) {
        options = options || {};
        this.unbindRef();

        this._firebase = {
          origin: options.origin || '_default',
          listeners: [],
          syncProps: {},
          updating: {},
          readOnly: options.readOnly
        }

        if (typeof ref === 'string') {
          this._firebaseBindUrlTemplate(ref);
        } else {
          this.firebaseRef = ref;
        }

        for (var prop in this.properties) {
          if (this.properties[prop].sync) {
            var fbProp = this.properties[prop].sync;
            if (fbProp === true) fbProp = prop;
            this._firebase.syncProps[prop] = fbProp;

            if (!options.manual && !options.readOnly) {
              var l = this.firebaseLocalChanged.bind(this, [prop]);
              var ev = dasherize(prop) + '-changed';

              this.addEventListener(ev, l);
              this._firebase.listeners.push([ev, l]);
            }
          }
        }
      },

      unbindRef: function() {
        if (!this._firebase) return;
        if (this._firebase.ref) this._firebase.ref.off('value', this.firebaseRemoteChanged, this);

        for (var i = 0; i < this._firebase.listeners.length; i++) {
          var args = this._firebase.listeners[i];
          this.removeEventListener.apply(this, args);
        }
        PolymerFire._removeOriginListener(this._firebase.origin, this);
        this._firebase = null;
      },

      updateRef: function(values) {
        if (values) {
          for (var prop of values) {
            this[prop] = values[prop];
          }
        }
        this.firebaseLocalChanged(Object.keys(this._firebase.syncProps));
      },

      _firebaseLog: function(message) {
        if (this.hasAttribute('log')) {
          console.log("PolymerFire:", message);
        }
      },

      _firebaseBindUrlTemplate: function(urlTemplate) {
        var parts = urlTemplate.split('/');
        var origin = this._firebase.origin;
        var pathOnly = urlTemplate.indexOf('/') === 0;

        var propNames = [];
        var segmentProps = {};
        var optionalProps = {};

        for (var i = 0 ; i < parts.length; i++) {
          if (parts[i].indexOf('::') === 0) {
            var prop = parts[i].substr(2);
            propNames.push(prop)
            segmentProps[prop] = i
            optionalProps[prop] = i;
          } else if (parts[i].indexOf(':') === 0) {
            propNames.push(parts[i].substr(1));
            segmentProps[parts[i].substr(1)] = i;
          }
        }

        var updateFn = function() {
          var outParts = parts.slice(0);
          var ready = true;
          for (var i = 0; i < propNames.length; i++) {
            var prop = propNames[i];
            var val = this[prop] || "";
            val = val.toString();
            outParts[segmentProps[prop]] = val;
            // if we don't have a value and prop isn't optional, we're not ready
            if (!val.length && !optionalProps[prop]) {
              ready = false;
            }
          }

          if (pathOnly && !PolymerFire._origins[origin]) {
            ready = false;
          }

          if (ready) {
            var outUrl = outParts.join("/")
            if (pathOnly) {
              outUrl = PolymerFire._origins[origin] + outUrl;
            }
            this._firebaseLog("Binding to URL " + outUrl);
            this._firebaseBindUrl(outUrl);
          } else {
            this._firebaseLog("Waiting to bind to URL " + urlTemplate + " (missing required properties)");
            this._firebaseBindUrl(null);
          }
        }
        this._firebase.updateUrl = updateFn.bind(this);

        if (pathOnly) {
          PolymerFire._addOriginListener(origin, this);
        }
        for (var i = 0; i < propNames.length; i++) {
          var ev = dasherize(propNames[i]) + '-changed';
          this.addEventListener(ev, updateFn);
          this._firebase.listeners.push([ev, this._firebase.updateUrl]);
        }
        this._firebase.updateUrl();
      },

      _firebaseBindUrl: function(url) {
        if (url) {
          this.firebaseRef = new Firebase(url);
        } else {
          this.firebaseRef = null;
        }
      },

      set firebaseRef(ref) {
        if (this._firebase.ref) {
          if (this._firebase.ref === ref) return;
          this._firebase.ref.off('value', this.firebaseRemoteChanged, this);
        }
        this._firebase.ref = ref;
        if (this._firebase.ref) {
          this.firebaseLoaded = false;
          ref.on('value', this.firebaseRemoteChanged, this);
        }
      },
      get firebaseRef() {
        return this._firebase.ref;
      },

      firebaseRemoteChanged: function(snap) {
        this._firebaseLog("received new data from " + snap.ref().path.toString());
        var val = snap.val() || {};
        this._firebase.snapVal = val;
        for (var prop in this._firebase.syncProps) {
          var propVal = val[this._firebase.syncProps[prop]];
          if (this[prop] !== propVal && !this._firebase.updating[prop]) {
            var defaultVal = null;
            if (this.getPropertyType(prop) === String) { defaultVal = ""; }

            this[prop] = propVal || defaultVal;
          }
        }
        if (!this.firebaseLoaded) this.firebaseLoaded = true;
      },

      firebaseLocalChanged: function(props) {
        if (this._firebase.readOnly) {
          throw new Error("PolymerFire: Tried to update data from a readOnly binding");
        }

        var changeset = {};

        for (var i = 0; i < props.length; i++) {
          var prop = props[i];
          var syncProp = this._firebase.syncProps[prop];
          if (!this._firebase.snapVal || this._firebase.snapVal[syncProp] !== this[prop]) {
            this._firebase.updating[prop] = true;
            changeset[syncProp] = this[prop] || null;
          }
        }

        var persistKeys = Object.keys(changeset);
        if (persistKeys.length) {
          this._firebaseLog("persisting " + persistKeys.join(",") + " to " + this.firebaseRef.path.toString());
        }

        this.firebaseRef.update(changeset, function(err) {
          for (var i = 0; i < props.length; i++) {
            this._firebase.updating[props[i]] = false;
          }
          if (err) throw new Error("PolymerFire: " + err);
        }.bind(this));
      }
    },

    _addOriginListener: function(name, el) {
      PolymerFire._originListeners[name] = PolymerFire._originListeners[name] || [];
      PolymerFire._originListeners[name].push(el);
    },
    _removeOriginListener: function(name, el) {
      if (!PolymerFire._originListeners[name]) return;
      var i = PolymerFire._originListeners[name].indexOf(el);
      if (i < 0) return;
      PolymerFire._originListeners[name].splice(i, 1);
    },
  }

  context.PolymerFire = PolymerFire;
})(window);