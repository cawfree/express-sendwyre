import express from "express";
import { OK } from "http-status-codes";
import { compile } from "handlebars";
import { decode as atob } from "base-64";
import { typeCheck } from "type-check";

const defaultOptions = Object.freeze({
  env: "test",
});

const maybeRedirect = (redirect) => {
  if (redirect === undefined) {
    return "null";
  } else if (typeCheck("String", redirect)) {
    return `"${atob(redirect)}"`;
  }
  throw new Error(`Encountered invalid redirect.`);
};

const verifyMiddleware = ({ ...options }) => async (req, res, next) => {
  try {
    const html = `
<!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.3/jquery.min.js"></script>
    <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
    <script src="https://verify.sendwyre.com/js/pm-widget-init.js"></script>
    <script type="text/javascript">
      function post(data) {
        /* react-native */
        if (window.ReactNativeWebView) {
          return window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
        /* browser */
        return top.postMessage(
          JSON.stringify(data),
          (window.location != window.parent.location) ? document.referrer: document.location,
        );
      }
  
      var handler = new WyrePmWidget({
        env: "{{{env}}}",
        onLoad: function() {
          handler.open();
        },
        onSuccess: function(result) {
          return post({ type: "plaid/result", publicToken: result.publicToken });
        },
        onExit: function(err) {
          return post({ type: "plaid/error", error: err.toString() });
        }
      });
    </script>
  </head>
  <body></body>
</html>
      `.trim();
    return res.status(OK).send(
      compile(html)({ ...options })
    );
  } catch (e) {
    return next(e);
  }
};

export const verify = (options = defaultOptions) =>
  express().get("/", verifyMiddleware({ ...defaultOptions, ...options }));
