(function(context) {
  var PolymerFire = function(options) {
    options.properties = options.properties || [];
    var _listeners = [];
    var _updating = {};
    var _childListener = null;

    return {
      bindRef: function() {
        this.unbindRef();

        this.firebaseRef = new Firebase(this.firebaseRoot);
        if (options.childProperty) {
          this.firebaseRef = this.firebaseRef.child(this[options.childProperty]);
          _childListener = this.bindRef.bind(this);
          this.addEventListener(options.childProperty + '-changed', _childListener);
        }
        this.firebaseRef.on('value', this.firebaseRemoteChanged.bind(this));

        options.properties.forEach(function(prop) {
          var l = this.firebaseLocalChanged.bind(this, prop);
          l._prop = prop;
          this.addEventListener(prop + '-changed', l);
          _listeners.push(l);
        }.bind(this));
      },
      
      unbindRef: function() {
        if (this.firebaseRef) {
          this.firebaseRef.off(this.firebaseValueChanged);
          this.firebaseRef = null;
        }
        if (_childListener) {
          this.removeEventListener(options.childProperty + '-changed', _childListener);
        }
        _listeners.forEach(function(l) {
          this.removeEventListener(l._prop + '-changed', l);
        }.bind(this));
        _listeners = [];
      },

      firebaseRemoteChanged: function(snap) {
        if (options.properties.length) {
          var val = snap.val() || {};
          console.log(val);
          options.properties.forEach(function(prop) {
            if (this[prop] !== val[prop] && !_updating[prop]) {
              console.log("setting",prop,"to",val[prop]);
              this[prop] = val[prop];
            }
          }.bind(this));
        }
      },
      firebaseLocalChanged: function(prop, e) {
        _updating[prop] = true;
        var changeset = {};
        changeset[prop] = e.detail.value;
        this.firebaseRef.update(changeset, function(err) {
          _updating[prop] = false;
          if (err) throw new Error("PolymerFire: " + err);
        });
      },
      get firebaseRoot() {
        if (options.root) {
          return options.root;
        } else if (options.rootProperty) {
          return this[options.rootProperty];
        } else {
          throw new Error("PolymerFire: Must specify 'root' or 'rootProperty' to bind a reference.");
        }
      }
    }
  }

  PolymerFire.options = {};

  context.PolymerFire = PolymerFire;
})(window);