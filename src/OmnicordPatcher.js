// Handles the patching of functions
// Tried to make it as simple as possible
export class OmnicordPatcher{
    // The functions that have been patched
    // Map<Object, Map<FunctionName, OmnicordFunctionPatch>>
    static patchedObjects = new Map();

    // Adds a prefix to a function
    static addPrefix(targetObject, targetName, prefix){
        if (!isFunctionOfObject(targetObject, targetName)) return;
        let patches = this.getPatchesOfFunction(targetObject, targetName);
        return patches.createPrefix(prefix);
    }

    // Adds a postfix to a function
    static addPostfix(targetObject, targetName, postfix){
        if (!isFunctionOfObject(targetObject, targetName)) return;
        let patches = this.getPatchesOfFunction(targetObject, targetName);
        return patches.createPostfix(postfix);
    }

    // Adds an override to a function
    static addOverride(targetObject, targetName, override){
        if (!isFunctionOfObject(targetObject, targetName)) return;
        let patches = this.getPatchesOfFunction(targetObject, targetName);
        return patches.createOverride(override);
    }

    // Whether a function has been patched or not
    static isPatched(targetObj, targetName){
        return OmnicordPatcher.patchedObjects.has(targetObj) && OmnicordPatcher.patchedObjects.get(targetObj).has(targetName);
    }

    // Overrides the default implementation with a custom hook
    // The hook will check for registered prefixes, postfixes and overrides
    static patch(targetObj, targetName, defaultImplementation){
        let patch = new OmnicordFunctionPatch(defaultImplementation);
        this.patchedObjects.set(targetObj, new Map([[targetName, patch]]));
        this.patchedObjects.get(targetObj).set(targetName, patch);

        let proxy = new Proxy(defaultImplementation, {
            apply: (target, property, args) => {
                patch.runPrefixes(property, args);
                let value = patch.runOverrides(property, args);
                return patch.runPostfixes(property, args, value);
            },
            construct: (target, args) => {
                patch.runPrefixes(defaultImplementation, args);
                let value = patch.runOverridesForConstructor(defaultImplementation, args);
                return patch.runPostfixes(defaultImplementation, args, value);
            }
        });

        // We try to safely define the property
        if (!Reflect.defineProperty(targetObj, targetName, {value: defaultImplementation, configurable: true, writable: true})){
            // If it fails, we just assign it
            targetObj[targetName] = proxy;
        }

        return patch;
    }

    // Gets the patches for a function
    // In the case that the function has not been patched, it will be patched here
    static getPatchesOfFunction(targetObj, targetName){
        const defaultImplementation = targetObj[targetName];

        if (this.isPatched(targetObj, targetName)){
            return this.patchedObjects.get(targetObj).get(targetName);
        }

        return this.patch(targetObj, targetName, defaultImplementation);
    }

    // Unpatches all patches from a given function
    static unpatchAll(targetObj, targetName){
        if (!this.isPatched(targetObj, targetName))
            return;

        // Yeah, we never unpatch, we just clear the patches ;)
        // We could unpatch, but it's not really necessary as far as I know
        // And also allows us to avoid patching again if we need to
        let patches = this.patchedObjects.get(targetObj).get(targetName);
        patches.prefixes.clear();
        patches.postfixes.clear();
        patches.overrides.clear();
    }

    // Unpatches a prefix patch from a given function
    static unpatchPrefix(targetObj, targetName, omnicordPatch){
        if (!this.isPatched(targetObj, targetName)) return;
        let patches = this.patchedObjects.get(targetObj).get(targetName);
        patches.prefixes.delete(omnicordPatch);
    }

    // Unpatches a postfix patch from a given function
    static unpatchPostfix(targetObj, targetName, omnicordPatch){
        if (!this.isPatched(targetObj, targetName)) return;
        let patches = this.patchedObjects.get(targetObj).get(targetName);
        patches.postfixes.delete(omnicordPatch);
    }

    // Unpatches an override patch from a given function
    static unpatchOverride(targetObj, targetName, omnicordPatch){
        if (!this.isPatched(targetObj, targetName)) return;
        let patches = this.patchedObjects.get(targetObj).get(targetName);
        patches.overrides.delete(omnicordPatch);
    }
}

class OmnicordFunctionPatch
{
    prefixes = new Set();
    postfixes = new Set();
    overrides = new Set();
    original = null;

    constructor(originalFunction){
        this.original = originalFunction;
    }

    // Adds a prefix to the function
    // Returns the patch so that it can be removed if necessary
    createPrefix(prefix){
        let patch = new OmnicordPatch(prefix);
        this.prefixes.add(patch);
        return patch;
    }

    // Adds a postfix to the function
    // Returns the patch so that it can be removed if necessary
    createPostfix(postfix){
        let patch = new OmnicordPatch(postfix);
        this.postfixes.add(patch);
        return patch;
    }

    // Adds an override to the function
    // Returns the patch so that it can be removed if necessary
    createOverride(override){
        let patch = new OmnicordPatch(override);
        this.overrides.add(patch);
        return patch;
    }

    runPrefixes(ctx, args){
        this.prefixes.forEach(prefix => prefix.method.apply(ctx, args));
    }

    runPostfixes(ctx, args, value){
        this.postfixes.forEach(postfix => value = postfix.method.apply(ctx, args, value));
        return value;
    }

    runOverrides(ctx, args){
        // If there are no overrides, we just call the original function
        if (this.overrides.size === 0){
            return this.original.apply(ctx, args);
        }

        let value = undefined;
        // Otherwise we call the overrides
        this.overrides.forEach(override => value = override.method.apply(ctx, args, this.original));
        return value;
    }

    runOverridesForConstructor(ctx, args){
        // If there are no overrides, we just call the original function
        if (this.overrides.size === 0){
            // As there is a constructor, we need to use Reflect.construct
            return Reflect.construct(ctx, args);
        }

        let value = undefined;
        // Otherwise we call the overrides
        this.overrides.forEach(override => value = override.method.apply(ctx, args));
        return value;
    }
}

class OmnicordPatch
{
    method = null;

    constructor(method){
        this.method = method;
    }
}

// Whether a function exists on an object or not
function isFunctionOfObject(obj, name) {
    return typeof obj[name] === 'function';
}