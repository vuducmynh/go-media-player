//go:build !windows

package whisper

import "os/exec"

func setHideWindow(cmd *exec.Cmd) {
	// No-op on non-Windows platforms
}
