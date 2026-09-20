package main

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"time"
	"unsafe"

	"go-audio-play/internal/infrastructure/storage"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func showErrorMessage(title, msg string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	messageBoxW := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(msg)
	// 0x10 = MB_ICONERROR | MB_OK
	messageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

func logCrash(err error) {
	logPath := filepath.Join(storage.GetDataDir(), "crash.log")
	content := fmt.Sprintf("[%s] Fatal Error: %v\n", time.Now().Format(time.RFC3339), err)
	_ = os.WriteFile(logPath, []byte(content), 0644)
}

func main() {
	defer func() {
		if r := recover(); r != nil {
			err := fmt.Errorf("panic: %v", r)
			logCrash(err)
			showErrorMessage("Go Audio Player - Lỗi Khởi Động", fmt.Sprintf("Ứng dụng gặp sự cố bất ngờ:\n\n%v\n\nChi tiết được lưu tại:\n%s", err, filepath.Join(storage.GetDataDir(), "crash.log")))
		}
	}()

	// Create an instance of the app structure
	app := NewApp()

	// Ensure WebView2 user data directory exists
	webviewDataDir := filepath.Join(storage.GetDataDir(), "webview2")
	_ = os.MkdirAll(webviewDataDir, 0755)

	// Create application with options
	err := wails.Run(&options.App{
		Title:             "Go Audio & Video Player - Listening Master",
		Width:             1280,
		Height:            820,
		MinWidth:          960,
		MinHeight:         640,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 20, G: 20, B: 24, A: 255},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "go-audio-player-windows-v1",
			OnSecondInstanceLaunch: func(secondInstanceData options.SecondInstanceData) {
				if app.ctx != nil {
					wailsRuntime.WindowUnminimise(app.ctx)
					wailsRuntime.WindowShow(app.ctx)
				}
			},
		},
		Windows: &windows.Options{
			WebviewIsTransparent:               false,
			WindowIsTranslucent:                false,
			BackdropType:                       windows.Auto,
			Theme:                              windows.Dark,
			WebviewUserDataPath:                webviewDataDir,
			WebviewDisableRendererCodeIntegrity: true,
			CustomTheme: &windows.ThemeSettings{
				DarkModeTitleBar:   windows.RGB(20, 20, 24),
				DarkModeTitleText:  windows.RGB(255, 255, 255),
				DarkModeBorder:     windows.RGB(40, 40, 48),
				LightModeTitleBar:  windows.RGB(240, 240, 245),
				LightModeTitleText: windows.RGB(0, 0, 0),
				LightModeBorder:    windows.RGB(220, 220, 230),
			},
			Messages: &windows.Messages{
				InstallationRequired: "Yêu cầu cài đặt WebView2",
				UpdateRequired:       "Yêu cầu cập nhật WebView2",
				MissingRequirements:  "Ứng dụng cần Microsoft Edge WebView2 Runtime để hoạt động.\n\nVui lòng tải và cài đặt WebView2 từ Microsoft:\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703",
				Webview2NotInstalled: "WebView2 chưa được cài đặt",
				Error:                "Lỗi khởi chạy",
				FailedToInstall:      "Không thể cài đặt tự động",
				DownloadPage:         "Mở trang tải WebView2",
				PressOKToInstall:     "Nhấn OK để cài đặt",
				ContactAdmin:         "Vui lòng liên hệ quản trị viên",
			},
		},
	})

	if err != nil {
		logCrash(err)
		showErrorMessage("Go Audio Player - Lỗi Khởi Động", fmt.Sprintf("Không thể khởi động ứng dụng:\n\n%v\n\nChi tiết được lưu tại:\n%s", err, filepath.Join(storage.GetDataDir(), "crash.log")))
	}
}

