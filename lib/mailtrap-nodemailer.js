const Module = require('module');
const { sendMail, isConfigured } = require('./mailtrap');

if (!isConfigured()) {
  console.warn('[mailtrap-nodemailer] MAILTRAP_TOKEN/from not configured; legacy Nodemailer transport remains available.');
  return;
}

const originalLoad = Module._load;
const nodemailerShim = {
  createTransport() {
    return {
      sendMail,
      verify: async () => true,
      close: () => {},
    };
  },
};

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'nodemailer') return nodemailerShim;
  return originalLoad.call(this, request, parent, isMain);
};

console.log('[mailtrap-nodemailer] Mailtrap Email API enabled for legacy Nodemailer senders.');
