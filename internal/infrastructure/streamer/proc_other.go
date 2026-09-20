//go:build !windows

package streamer

import "os/exec"

func setHideWindow(cmd *exec.Cmd) {
	// No-op on non-Windows platforms
}
