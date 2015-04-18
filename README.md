# PolymerFire

PolymerFire is a mixin for Polymer 0.8 that enables easy two-way data sync
between custom Polymer elements and Firebase.

### Installation

    bower install --save polymerfire

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
    mixins: [PolymerFire.Binding],
    properties: {
      uid: String,
      firstName: {
        type: String,
        notify: true,
        sync: 'first_name'
      },
      email: {
        type: String,
        notify: true,
        sync: true
      }
    },
    attached: function() {
      this.bindRef('https://my-app.firebaseio.com/users/:uid');
    },
    detached: function() {
      this.unbindRef();
    }
  });
</script>
```

### bindRef(ref, options)

The `bindRef` method should be called to initiate Firebase synchronization for
the element. It is recommended that it is called in either the `ready` or
`attached` lifecycle callbacks.

The `ref` argument can be either a Firebase ref (i.e. the result of `new Firebase()`)
or a string representing a Firebase URL. You can bind to a dynamic location by
inserting `:propName` into the URL, which will trigger a re-binding each time
the property changes.

#### Options

* **manual:** When `true`, data will be synced *from* Firebase in real-time, but
  will only be persisted back to firebase when `updateRef()` is called manually.

### updateRef(values)

Persists all local properties with the `sync` feature turned on to Firebase.
Usually only needs to be called when the `manual` option is provided to `bindRef`.

As a convenience, you can pass an object to `updateRef` with properties you wish
to alter before persisting:

```js
myElement.updateRef({name: 'foo', email: 'bar@example.com'});
```

This is functionally identical to setting each of the specified properties and
then calling `updateRef` with no arguments.

### unbindRef()

The `unbindRef` method will disconnect all event listeners both on the element
instance and on the Firebase location to which the instance has been bound. It
should typically be called in the `detached` lifecycle event.

### Dynamic Refs

There are many cases where you might want the Firebase ref to be determined based
on element property values. This can be achieved using templated path segments.

    https://my-app.firebaseio.com/users/:uid

The above example would substitute the property `uid` as the last segment. Note
that you can also use a property substitution for the actual Firebase hostname:

    https://:firebaseOrigin/users/:uid

#### Preset Origin

It can be useful for the Firebase origin to be configurable at a global level
so that different Firebases can be used for local development, staging, and
production, for example.

PolymerFire allows for the registration of named origins. These are registered
like so:

    PolymerFire.origin('https://my.firebaseio.com', 'app');
    
The second argument is optional and allows you to keep multiple named origins
in the same application (name will be `_default` if not set).

To utilize named origins, specify your ref as an absolute path instead of a
fully-qualified URL when binding, and use the `origin` option to specify a name:

    this.bindRef('/users/:uid', {origin: 'app'});
    
If the `origin` option isn't specified, it will use the default if set.

#### Delayed Binding

PolymerFire **will not bind** templated path segments that are falsy (in the
example above, if `uid` is null or an empty string, it won't bind). Instead,
it will listen for the `<property>-changed` events on the template segments and
bind when all segments are present. This applies to origins as well, so you can
safely set both dynamic path segments and origins asynchronously and count on
PolymerFire to adjust accordingly.

If you wish to explicitly allow an empty dynamic segment, simply use two colons
instead of one (e.g. `/categories/:category/::subcategory`).

### Property Configuration

PolymerFire hooks into the existing declarative property system of Polymer. Simply
add the `sync` option to a property to specify that it should be synced with
Firebase. If `sync` is `true`, the property name will be used as-is. If `sync`
is a string, the property will be synced to the specified key instead.

```js
{
  properties: {
    firstName: {
      notify: true,
      sync: 'first_name'
    },
    email: {
      notify: true,
      sync: true
    }
  }
}
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
synced to the `name` and `email` properties of an element, we might do something
like this:

```html
<!-- app-user is bound to Firebase -->
<app-user uid="123" name="{{name}}" email="{{email}}"></app-user>

<!-- name is bound to `keyup` and persists on each keystroke -->
<input value="{{name::keyup}}">
<!-- email is bound to `change` and persist on blur or form submission -->
<input value="{{email::change}}">
```

### Debugging

You can add the `log` attribute to a PolymerFire element to get useful debug
log messages for events such as binding to a URL, values updating, persisting,
etc.

### Roadmap

- [x] Allow for custom serialization (e.g. changing property names or altering values)
- [x] Specify `readOnly` for one-way bindings from Firebase
- [ ] Create means of binding arrays in addition to objects
- [ ] Allow for sub-property path change binding (e.g. `user.name`)
- [ ] Allow for a global Firebase root to be set such that a `path` option can be used instead of a full URL
- [x] Add `updateRef()` to manually sync the entire property set back to the ref