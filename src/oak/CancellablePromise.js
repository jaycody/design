"use strict";
//////////////////////////////
//
//	Cancellable promise
//
//  Returns a Promise with a `cancel()` method, which a caller can use to "cancel" the promise.
//  "Cancelling" a promise will reject it, indicating that you no longer care about the result.
//
//    const promise = new CancellablePromise(resolve, reject, cancel) {...}
//    promise.onCancel( console.warn );
//    promise.cancel("User pressed the cancel button")
//    // => "User pressed the cancel button."
//
//
//  You can also check the state of the promise:
//
//    const p = new CancellablePromise(...);
//    p.isSettled;          // `true` if the promise has already been settled
//    p.wasFulfilled;       // `true` if the promise was resolved
//    p.wasRejected;        // `true` if the promse was rejected or cancelled.
//    p.wasCancelled;       // `true` if the promise was cancelled.
//
//////////////////////////////

export default class CancellablePromise extends Promise {
  // State constants
  static FULFILLED = "FULFILLED";
  static REJECTED = "REJECTED";
  static CANCELLED = "CANCELLED";

  // Class constructor for a `Cancellation`.
  static Cancellation = class Cancellation extends Error {};

  constructor(promiseFn) {
    // Call the superclass constructor, remembering its resolve/reject methods.
    let superResolve;
    let superReject;
    super((resolve, reject) => {
      superResolve = resolve;
      superReject = reject;
    });

    // Create a private `setState` routine to change the returned promise's state.
    // Returns `true` if state was changed, or `false` if we've settled already.
    const setState = (state) => {
      if (this.isSettled) return false;

      // Add frozen `state` property for debugging and introspection.
      Object.defineProperty(this, "state", { value: state });
      return true;
    }

    // resolve/reject handlers
    const resolve = (value) => {
      if (setState(CancellablePromise.FULFILLED))
        superResolve(value);
    }

    const reject = (reason) => {
      if (setState(CancellablePromise.REJECTED))
        superReject(reason);
    }

    const cancel = (reason) => {
      if (setState(CancellablePromise.CANCELLED)) {
        // call any defined cancel handlers first
        if (cancelHandlers) cancelHandlers.forEach( (handler) => handler(reason) );
        superReject(reason);
      }
    }

    // `promise.onCancel(<handler>)` to add an onCancel handler.
    let cancelHandlers;
    const onCancel = (handler) => {
      if (this.isSettled) {
        this.catch(handler);
      } else {
        if (!cancelHandlers) cancelHandlers = [];
        cancelHandlers.push(handler);
      }
    }

    // execute the promise function
    try {
      promiseFn( resolve, reject, cancel );
    }
    catch (error) {
      reject(error);
    }

    // add `cancel()` and `onCancel()` methods to the promise
    Object.defineProperties(this, { cancel:{value:cancel}, onCancel:{value:onCancel} });
  }

  // Wrap `then` and `catch` to return a `CancelablePromise`.
  then(onSuccess, onFailure) {

  }

  catch(onFailure) {

  }

  // Add a `always` method which runs


  // Syntactic sugar so you can tell if a promise is in any of the given states.
  get isSettled() {
    return (this.state === undefined);
  }

  get wasFulfilled() {
    return (this.state === CancellablePromise.FULFILLED);
  }

  get wasRejected() {
    return (this.state === CancellablePromise.REJECTED
      || this.state === CancellablePromise.CANCELLED);
  }

  get wasCancelled() {
    return (this.state === CancellablePromise.CANCELLED);
  }


  // Wrap static Promise methods to return a CancellablePromise
  // API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  static resolve(value) {
    return new CancellablePromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new CancellablePromise((resolve, reject) => reject(reason));
  }

  static all(iterable) {
    return new CancellablePromise((resolve, reject) => {
      Promise.all(iterable)
             .then(resolve, reject);
    })
  }

  static race(iterable) {
    return new CancellablePromise((resolve, reject) => {
      Promise.race(iterable)
             .then(resolve, reject);
    })
  }

}
