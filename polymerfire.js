(function(context) {
  var PolymerFire = {
    bindRef: function(ref, options) {
      this.unbindRef();

      this._firebase = options || {};
      this._firebase.listeners = [];
      this._firebase.syncProps = {};
      this._firebase.updating = {};

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
          
          if (!options.manual) {
            var l = this.firebaseLocalChanged.bind(this, [prop]);
            var ev = Polymer.CaseMap.camelToDashCase(prop) + '-changed';
            
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
      this._firebase = null;
    },

    updateRef: function() {
      this.firebaseLocalChanged(Object.keys(this._firebase.syncProps));
    },

    _firebaseBindUrlTemplate(urlTemplate) {
      var parts = urlTemplate.split('/');

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

        if (ready) {
          this._firebaseBindUrl(outParts.join("/"));
        } else {
          this._firebaseBindUrl(null);
        }
      }
      updateFn = updateFn.bind(this);

      for (var i = 0; i < propNames.length; i++) {
        var ev = Polymer.CaseMap.camelToDashCase(propNames[i]) + '-changed';
        this.addEventListener(ev, updateFn);
        this._firebase.listeners.push([ev, updateFn]);
      }
      updateFn();
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
      var val = snap.val() || {};
      for (var prop in this._firebase.syncProps) {
        var propVal = val[this._firebase.syncProps[prop]];
        if (this[prop] !== propVal && !this._firebase.updating[prop]) {
          var defaultVal = null;
          if (this.getPropertyType(prop) === String) { defaultVal = ""; }

          console.log('remoteChanged', prop, propVal || defaultVal);
          this[prop] = propVal || defaultVal;
        }
      }
      if (!this.firebaseLoaded) this.firebaseLoaded = true;
    },
    firebaseLocalChanged: function(props) {
      console.log('localChanged', props);
      var changeset = {};

      for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        this._firebase.updating[prop] = true;
        changeset[this._firebase.syncProps[prop]] = this[prop] || null;
      }

      this.firebaseRef.update(changeset, function(err) {
        for (var i = 0; i < props.length; i++) {
          this._firebase.updating[props[i]] = false;
        }
        if (err) throw new Error("PolymerFire: " + err);
      }.bind(this));
    }
  }

  context.PolymerFire = PolymerFire;
})(window);