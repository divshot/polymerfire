# PolymerFire

PolymerFire is a mixin for Polymer 0.8 that enables easy two-way data sync
between custom Polymer elements and Firebase.

### Installation

    bower install --save divshot/polymerfire

### Usage

First, you'll need to include PolymerFire using an HTML Import:

```html
<link rel="import" href="bower_components/polymerfire/polymerfire.html">
```

Next, when defining a custom element use the `PolymerFire` factory mixin and
use the `bindRef()` and `unbindRef()` methods to activate the binding:

```html
<script>
  Polymer({
    is: 'app-user',
    mixins: [PolymerFire({
      root: 'https://my-firebase.firebaseio.com/users',
      childProperty: 'userid'
    })],
    properties: {
      userid: String,
      name: {
        type: String,
        notify: true
      }
    },
    attached: function() {
      this.bindRef();
    },
    detached: function() {
      this.unbindRef();
    }
  });
</script>
```

### Binding Mechanics

PolymerFire uses the same binding mechanics as Polymer generally: it
listens for `[property]-changed` events to sync data back to Firebase. If you
modify a properties data in a way that doesn't trigger an event (e.g. changing
a property on an object), you will need to manually fire the event to sync the
change.

You can use Polymer's one-way bindings (`[[prop]]` instead of `{{prop}}`) to
bind data in situations where you don't want changes to persist back to Firebase.

As an example of binding to native form elements, if we had a PolymerFire mixin
to the `name` and `email` properties of an element, we might do something like
this:

```html
<!-- app-user is bound to Firebase -->
<app-user id="123" name="{{name}}" email="{{email}}"></app-user>

<!-- name is bound to `keyup` and persists on each keystroke -->
<input value="{{name::keyup}}">
<!-- email is bound to `change` and persist on blur or form submission -->
<input value="{{email::change}}">
```

### Available Options

* **root:** The Firebase URL to which to bind. If `childProperty` is specified,
  the root will be the base ref upon which `.child()` is called.
* **rootProperty:** Allow the Firebase URL to be specified by a property of the
  element instead of explicitly. This property must have `notify: true` set on
  the element if you plan to dynamically alter the value.
* **childProperty:** Use a property of the custom element to determine a child
  path for the Firebase URL. Useful in cases where you want to bind to e.g.
  a dynamic ID.
* **properties:** An array of properties that will be reflected into the data
  structure. You **must** declare each of these in the Polymer `properties`
  configuration with `notify: true` in order for two-way binding to work.

### Roadmap

- [ ] Allow for custom serialization (e.g. changing property names or altering values)
- [ ] Specify `readOnly` for one-way bindings from Firebase
- [ ] Create means of binding arrays in addition to lists
- [ ] Allow for sub-property path change binding (e.g. `user.name`)
- [ ] Allow for a global Firebase root to be set such that a `path` option can be used instead of a full URL
- [ ] Add `syncRef()` to manually sync the entire property set back to the ref