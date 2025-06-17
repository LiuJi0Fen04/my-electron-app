#include <D:\02_electron_project\my-electron-app\node_modules\node-addon-api\napi.h>
#include <windows.h>

// 定义 DLL 函数指针
typedef void (*HelloFunc)();

Napi::Value CallHello(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // 加载 DLL
  HMODULE hDLL = LoadLibraryA("hello_world.dll");
  if (hDLL == NULL) {
    Napi::TypeError::New(env, "Failed to load DLL").ThrowAsJavaScriptException();
    return env.Null();
  }

  // 获取函数
  HelloFunc hello = (HelloFunc)GetProcAddress(hDLL, "hello");
  if (hello == NULL) {
    Napi::TypeError::New(env, "Failed to get 'hello' function").ThrowAsJavaScriptException();
    return env.Null();
  }

  // 调用
  hello();

  // 卸载 DLL
  FreeLibrary(hDLL);

  return env.Null();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("hello", Napi::Function::New(env, CallHello));
  return exports;
}

NODE_API_MODULE(hello_addon, Init)
