angular.module('ui.bootstrap.modal2', [])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
  .factory('$$stackedMap', function () {
    return {
      createNew: function () {
        var stack = [];
        var hash = {};

        return {
          add: function (key, value) {
            hash[key] = value;
            stack.push(key);
          },
          get: function (key) {
            return hash[key];
          },
          top: function () {
            return stack[stack.length - 1];
          },
          remove: function (key) {
            if (hash[key]) {
              stack.splice(stack.indexOf(key), 1);
              delete hash[key];
              return key;
            }
            return undefined;
          },
          removeTop: function () {
            return this.remove(this.top());
          },
          length: function () {
            return stack.length;
          }
        };
      }
    };
  })

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
  .directive('modalBackdrop', [function ($modalStack) {
    return {
      restrict: 'EA',
      scope: {},
      replace: true,
      templateUrl: 'template/modal/backdrop.html',
      link: function (scope, element, attrs) {
        scope.close = function() {

        }
      }
    };
  }])

  .directive('modalWindow', function () {
    //TODO: support fading - ideally with new animations... but it is not clear when those are going to happen
    return {
      restrict: 'EA',
      scope: {},
      replace: true,
      transclude: true,
      templateUrl: 'template/modal/window.html'
    };
  })

  .factory('$modalStack', ['$document', '$compile', '$rootScope', '$$stackedMap',
    function ($document, $compile, $rootScope, $$stackedMap) {

      var body = $document.find('body').eq(0);
      var openedWindows = $$stackedMap.createNew();
      var $modalStack = {};

      function removeModalWindow(modalInstance) {

        var modalWindow = openedWindows.get(modalInstance);

        //clean up the stack
        openedWindows.remove(modalInstance);

        //remove DOM element
        modalWindow.modalDomEl.remove();

        //remove backdrop
        //TODO: adding / removing backdrop element individually is not the best strategy
        if (modalWindow.backdropDomEl) {
          modalWindow.backdropDomEl.remove();
        }

        //destroy scope
        modalWindow.modalScope.$destroy();
      }

      $document.bind('keydown', function (evt) {

        var modalInstance, modalWindow;

        if (evt.which === 27) {
          modalInstance = openedWindows.top();

          if (modalInstance && openedWindows.get(modalInstance).keyboard) {
            $rootScope.$apply(function () {
              $modalStack.dismiss(openedWindows.top());
            });
          }
        }
      });

      //TODO: remember to prevent default if keyboard is closing things
      //TODO: close on click
      $document.bind('click', function (evt) {

        var modalWindow, modalInstance = openedWindows.top();
        if (modalInstance) {
          $rootScope.$apply(function () {
            $modalStack.dismiss(openedWindows.top());
          });
        }
      });

      $modalStack.open = function (modalInstance, modal) {

        var backdropDomEl;
        var modalDomEl = $compile(angular.element('<modal-window>').html(modal.content))(modal.scope);
        body.append(modalDomEl);

        if (modal.backdrop) {
          backdropDomEl = $compile(angular.element('<modal-backdrop>'))($rootScope);
          body.append(backdropDomEl);
        }

        openedWindows.add(modalInstance, {
          deferred: modal.deferred,
          modalScope: modal.scope,
          modalDomEl: modalDomEl,
          backdropDomEl: backdropDomEl,
          keyboard: modal.keyboard
        });
      };

      $modalStack.close = function (modalInstance, result) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow) {
          modalWindow.deferred.resolve(result);
          removeModalWindow(modalInstance);
        }
      };

      $modalStack.dismiss = function (modalInstance, reason) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow) {
          modalWindow.deferred.reject(reason);
          removeModalWindow(modalInstance);
        }
      };

      return $modalStack;
    }])

  .provider('$modal', function () {

    var defaultOptions = {
      backdrop: true, //can be also false or 'static'
      keyboard: true
    };

    return {
      options: defaultOptions,
      $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$modalStack',
        function ($injector, $rootScope, $q, $http, $templateCache, $controller, $modalStack) {

          var $modal = {};

          function getTemplatePromise(options) {
            return options.template ? $q.when(options.template) :
              $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                return result.data;
              });
          }

          function getResolvePromises(resolves) {
            var promisesArr = [];
            angular.forEach(resolves, function (value, key) {
              if (angular.isFunction(value) || angular.isArray(value)) {
                promisesArr.push($q.when($injector.invoke(value)));
              }
            });
            return promisesArr;
          }

          $modal.open = function (modalOptions) {

            var modalResultDeferred = $q.defer();

            //prepare an instance of a modal to be injected into controllers and returned to a caller
            var modalInstance = {
              result: modalResultDeferred.promise,
              close: function (result) {
                $modalStack.close(this, result);
              },
              dismiss: function (reason) {
                $modalStack.dismiss(this, reason);
              }
            };

            //merge and clean up options
            modalOptions = angular.extend(defaultOptions, modalOptions);
            modalOptions.resolve = modalOptions.resolve || {};

            //verify options
            if (!modalOptions.template && !modalOptions.templateUrl) {
              throw new Error('One of template or templateUrl options is required.');
            }

            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)))

              .then(function resolveSuccess(tplAndVars) {

                var modalScope = (modalOptions.scope || $rootScope).$new();

                var ctrlInstance, ctrlLocals = {};
                var resolveIter = 1;

                //TODO: how to signal that a window is being opened? And should I signal it here? Maybe only to the window template?

                //controllers
                if (modalOptions.controller) {
                  ctrlLocals.$scope = modalScope;
                  ctrlLocals.$modalInstance = modalInstance;
                  angular.forEach(modalOptions.resolve, function (value, key) {
                    ctrlLocals[key] = tplAndVars[resolveIter++];
                  });

                  ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
                }

                $modalStack.open(modalInstance, {
                  scope: modalScope,
                  deferred: modalResultDeferred,
                  content: tplAndVars[0],
                  backdrop: modalOptions.backdrop,
                  keyboard: modalOptions.keyboard
                });

              }, function resolveError(reason) {
                modalResultDeferred.reject(reason);
              });

            return modalInstance;
          };

          return $modal;
        }]
    };
  });