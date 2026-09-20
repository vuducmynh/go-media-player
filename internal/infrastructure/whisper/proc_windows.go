//go:build windows

package whisper

import (
	"os/exec"
	"syscall"
)

// setHideWindow prevents any console window or Windows Terminal from opening
func setHideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
}
