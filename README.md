# OmnicordPatcher
Simplified monkey patching library to help with modding.

# My first patch

First import the patcher class. (Classes are not allowed in hermes, you can find the non classed approach of this patcher inside the Omnicord repo).
```js
import {OmnicordPatcher} from "OmnicordPatcher";
```
Then we can use it to patch any method easily!
```js
// This prefixes the patched method with another method of our selection
OmnicordPatcher.addPrefix(targetObject, 'targetMethod', (args) => {
  console.log("hello from a prefix");
});

// This postfixes the patched method with another method of our selection
OmnicordPatcher.addPostfix(targetObject, 'targetMethod', (args, result) => {
  console.log("hello from a postfix");
  // We can modify the result of the patched method!
  value = 0;
});

// This overrides the patched method with another method of our selection
OmnicordPatcher.addOverride(targetObject, 'targetMethod', (args, originalMethod) => {
  console.log("hello from an override");
  // We could call the original method if needed
  // originalMethod(args);
});
```

As you can see it is pretty simple!

# Unpatching
For unpatching just save the returned method for your prefix, postfix or override:
```js
const myPrefix = OmnicordPatcher.addPrefix(......
OmnicordPatcher.unpatchPrefix(targetObject, targetMethod, myPrefix);
```

You can also unpatch all prefixes, postfixes and overrides from a patched method:
```js
OmnicordPatcher.unpatchAll(targetObject, targetMethod);
```

# Example
Imagine we have the function test inside the object `window`:
```js
function test(){
  console.log("this is a test");
}
```

This is how all the seen methods would look like:

```js
test();
// this is a test

const prefix = OmnicordPatcher.addPrefix(window, 'test', (_) => {
  console.log("hello from a prefix");
});

test();
// hello from a prefix
// this is a test

const postfix = OmnicordPatcher.addPostfix(window, 'test', (_, __) => {
  console.log("hello from a postfix");
});

test();
// hello from a prefix
// this is a test
// hello from a postfix

const override = OmnicordPatcher.addOverride(window, 'test', (_, __) => {
  console.log("hello from an override");
});

test();
// hello from a prefix
// hello from an override
// hello from a postfix
```

And we could then unpatch if needed:

```js
OmnicordPatcher.unpatchPrefix(window, 'test', prefix);

test();
// hello from an override
// hello from a postfix

OmnicordPatcher.unpatchPostfix(window, 'test', postfix);

test();
// hello from an override

OmnicordPatcher.unpatchOverride(window, 'test', override);

test();
// this is a test
```

As you can see we got the original function back after unpatching everything!

# Multi Prefixes, Postfixes and Overrides
Yes, you can have multiple prefixes, postfixes and overrides for a single method, they will run in order of registration, meaning that the later you register a method, the later it will run
