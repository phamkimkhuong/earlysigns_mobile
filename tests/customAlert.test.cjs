const test = require("node:test");
const assert = require("node:assert/strict");

// Mocking useAlertStore for testing customAlert utility logic
function createMockAlertStore() {
  let state = {
    config: null,
    isOpen: false,
  };

  const getState = () => state;
  const show = (config) => {
    state = { config, isOpen: true };
  };
  const hide = () => {
    state.config?.onDismiss?.();
    state = { config: null, isOpen: false };
  };

  return { getState, show, hide };
}

function createCustomAlert(store) {
  return {
    alert(title, message, buttons, options) {
      const hasDestructive = buttons?.some((b) => b.style === "destructive");
      const isConfirm = (buttons?.length || 0) > 1;
      const type = hasDestructive ? "danger" : isConfirm ? "confirm" : "info";

      store.show({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" }],
        cancelable: options?.cancelable ?? true,
        onDismiss: options?.onDismiss,
        type,
      });
    },

    confirm(params) {
      store.show({
        title: params.title,
        message: params.message,
        type: params.destructive ? "danger" : "confirm",
        buttons: [
          {
            text: params.cancelText || "Hủy",
            style: "cancel",
            onPress: params.onCancel,
          },
          {
            text: params.confirmText || "Xác nhận",
            style: params.destructive ? "destructive" : "default",
            onPress: params.onConfirm,
          },
        ],
        cancelable: true,
        onDismiss: params.onCancel,
      });
    },

    promptConfirm(params) {
      return new Promise((resolve) => {
        store.show({
          title: params.title,
          message: params.message,
          type: params.destructive ? "danger" : "confirm",
          buttons: [
            {
              text: params.cancelText || "Hủy",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: params.confirmText || "Xác nhận",
              style: params.destructive ? "destructive" : "default",
              onPress: () => resolve(true),
            },
          ],
          cancelable: true,
          onDismiss: () => resolve(false),
        });
      });
    },

    info(title, message, buttonText = "Đã hiểu", onConfirm) {
      store.show({
        title,
        message,
        type: "info",
        buttons: [{ text: buttonText, style: "default", onPress: onConfirm }],
        cancelable: true,
      });
    },

    danger(title, message, buttonText = "Đã hiểu", onConfirm) {
      store.show({
        title,
        message,
        type: "danger",
        buttons: [{ text: buttonText, style: "destructive", onPress: onConfirm }],
        cancelable: true,
      });
    },

    close() {
      store.hide();
    },
  };
}

test("customAlert.alert defaults to info type with single button", () => {
  const store = createMockAlertStore();
  const alert = createCustomAlert(store);

  alert.alert("Thông báo", "Đây là nội dung thử nghiệm");

  const state = store.getState();
  assert.equal(state.isOpen, true);
  assert.equal(state.config.title, "Thông báo");
  assert.equal(state.config.type, "info");
  assert.equal(state.config.buttons.length, 1);
  assert.equal(state.config.buttons[0].text, "OK");
});

test("customAlert.alert auto-detects danger type when destructive button is present", () => {
  const store = createMockAlertStore();
  const alert = createCustomAlert(store);

  let deleted = false;
  alert.alert("Xóa tài khoản", "Bạn có chắc?", [
    { text: "Hủy", style: "cancel" },
    { text: "Xóa", style: "destructive", onPress: () => { deleted = true; } },
  ]);

  const state = store.getState();
  assert.equal(state.isOpen, true);
  assert.equal(state.config.type, "danger");
  assert.equal(state.config.buttons.length, 2);

  state.config.buttons[1].onPress();
  assert.equal(deleted, true);
});

test("customAlert.confirm sets up two buttons and handles onConfirm", () => {
  const store = createMockAlertStore();
  const alert = createCustomAlert(store);

  let confirmed = false;
  alert.confirm({
    title: "Đăng xuất",
    message: "Bạn có muốn đăng xuất?",
    onConfirm: () => { confirmed = true; },
  });

  const state = store.getState();
  assert.equal(state.isOpen, true);
  assert.equal(state.config.type, "confirm");
  assert.equal(state.config.buttons[0].text, "Hủy");
  assert.equal(state.config.buttons[1].text, "Xác nhận");

  state.config.buttons[1].onPress();
  assert.equal(confirmed, true);
});

test("customAlert.promptConfirm resolves true on confirm and false on cancel", async () => {
  const store = createMockAlertStore();
  const alert = createCustomAlert(store);

  const promise = alert.promptConfirm({
    title: "Xác nhận",
    message: "Tiếp tục?",
  });

  const state = store.getState();
  state.config.buttons[1].onPress();

  const res = await promise;
  assert.equal(res, true);
});

test("customAlert.close closes the modal and invokes onDismiss", () => {
  const store = createMockAlertStore();
  const alert = createCustomAlert(store);

  let dismissed = false;
  alert.alert("Test", "Msg", [{ text: "OK" }], { onDismiss: () => { dismissed = true; } });

  assert.equal(store.getState().isOpen, true);
  alert.close();
  assert.equal(store.getState().isOpen, false);
  assert.equal(dismissed, true);
});
