package whisper

import (
	"encoding/json"
	"os/exec"
	"runtime"
	"strings"

	"go-audio-play/internal/domain/study"
	"go-audio-play/internal/infrastructure/storage"
)

type videoControllerInfo struct {
	Name        string      `json:"Name"`
	AdapterRAM  interface{} `json:"AdapterRAM"`
	DriverVer   string      `json:"DriverVersion"`
}

// DetectHardware interrogates the Windows system for video controllers, CPU topology, and storage
func DetectHardware(binDir string) study.HardwareInfo {
	info := study.HardwareInfo{
		GPUVendor:           "unknown",
		GPUName:             "Đồ họa cơ bản",
		VRAMMB:              0,
		CPUCores:            runtime.NumCPU(),
		CPUThreads:          runtime.NumCPU(),
		RAMMB:               8192,
		AccelerationType:    "cpu_avx",
		AccelerationEnabled: false,
		RecommendedBackend:  "cpu",
		IsPortable:          storage.IsPortable(),
		DataDir:             storage.GetDataDir(),
	}

	if runtime.GOOS != "windows" {
		return info
	}

	// 1. Query Windows CIM for Video Controllers
	cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion | ConvertTo-Json")
	setHideWindow(cmd)
	out, err := cmd.Output()
	if err == nil && len(out) > 0 {
		var list []videoControllerInfo
		if unmarshalErr := json.Unmarshal(out, &list); unmarshalErr != nil {
			var single videoControllerInfo
			if singleErr := json.Unmarshal(out, &single); singleErr == nil {
				list = append(list, single)
			}
		}

		// Select best dedicated GPU if multiple exist (NVIDIA > AMD > Intel > Basic)
		for _, vc := range list {
			name := strings.TrimSpace(vc.Name)
			lower := strings.ToLower(name)
			if lower == "" || strings.Contains(lower, "virtual") || strings.Contains(lower, "basic render") {
				continue
			}

			var vram int
			switch v := vc.AdapterRAM.(type) {
			case float64:
				vram = int(v / (1024 * 1024))
			case int64:
				vram = int(v / (1024 * 1024))
			}

			if strings.Contains(lower, "nvidia") || strings.Contains(lower, "geforce") || strings.Contains(lower, "quadro") || strings.Contains(lower, "rtx") || strings.Contains(lower, "gtx") {
				info.GPUVendor = "nvidia"
				info.GPUName = name
				info.VRAMMB = vram
				info.RecommendedBackend = "cuda"
				break // Highest priority
			} else if strings.Contains(lower, "amd") || strings.Contains(lower, "radeon") {
				if info.GPUVendor != "nvidia" {
					info.GPUVendor = "amd"
					info.GPUName = name
					info.VRAMMB = vram
					info.RecommendedBackend = "openblas"
				}
			} else if strings.Contains(lower, "intel") || strings.Contains(lower, "arc") || strings.Contains(lower, "iris") {
				if info.GPUVendor != "nvidia" && info.GPUVendor != "amd" {
					info.GPUVendor = "intel"
					info.GPUName = name
					info.VRAMMB = vram
					info.RecommendedBackend = "openblas"
				}
			} else if info.GPUVendor == "unknown" {
				info.GPUName = name
				info.VRAMMB = vram
			}
		}
	}

	// 2. Check installed acceleration libraries in any bin search dir
	if _, found := storage.FindExistingBinary("cublas64_12.dll"); found {
		info.AccelerationType = "cuda"
		info.AccelerationEnabled = true
	} else if _, found := storage.FindExistingBinary("ggml-cuda.dll"); found {
		info.AccelerationType = "cuda"
		info.AccelerationEnabled = true
	} else if _, found := storage.FindExistingBinary("libopenblas.dll"); found {
		info.AccelerationType = "openblas"
		info.AccelerationEnabled = true
	} else if _, found := storage.FindExistingBinary("openblas.dll"); found {
		info.AccelerationType = "openblas"
		info.AccelerationEnabled = true
	}

	return info
}

// EvaluateModelMatch matches model specs against host hardware and produces user guidance
func EvaluateModelMatch(m study.ModelInfo, hw study.HardwareInfo) (string, string) {
	isGPUActive := hw.AccelerationEnabled && hw.AccelerationType == "cuda"

	switch m.ID {
	case "tiny":
		return "good", "Siêu nhẹ, tốc độ cực nhanh, chạy được trên mọi máy tính."
	case "base":
		if !isGPUActive {
			return "perfect", "🌟 Đề xuất tốt nhất cho CPU máy bạn: Xử lý tức thì, tiếng Anh rõ ràng."
		}
		return "good", "Tốc độ chớp nhoáng trên GPU."
	case "small":
		return "good", "Cân bằng tốt giữa tốc độ và độ chính xác nhận diện."
	case "medium":
		if isGPUActive {
			return "good", "Độ chính xác cao, GPU của bạn xử lý mượt mà."
		}
		return "heavy", "Hơi nặng trên CPU thuần, khuyến khích dùng Turbo hoặc GPU."
	case "large-v3-turbo-q5_0":
		if isGPUActive {
			return "perfect", "🌟 Đề xuất hoàn hảo cho cấu hình của bạn: Nhận diện chuẩn xác 99%, GPU tăng tốc tối đa."
		}
		if hw.CPUThreads >= 8 {
			return "perfect", "🌟 Khuyên dùng: Kiến trúc Turbo 4 lớp tối ưu đa luồng CPU, nhận diện rất chuẩn."
		}
		return "good", "Độ chính xác rất cao, thời gian xử lý hợp lý."
	case "large-v3-q5_0":
		if isGPUActive && (hw.VRAMMB >= 4000 || hw.VRAMMB == 0) {
			return "good", "Độ chính xác đỉnh cao cho mọi accent khó, GPU 6GB của bạn gánh tốt."
		}
		return "heavy", "⚠️ Mô hình lớn nhất (~1.1GB, 32 lớp). Khuyên dùng Large-v3 Turbo để nhanh hơn gấp 5 lần."
	default:
		return "good", "Mô hình tùy chỉnh"
	}
}

// GetOptimalWhisperArgs computes thread count, processors, and whether to offload to GPU
func GetOptimalWhisperArgs(hw study.HardwareInfo) (processors int, threads int, useGPU bool) {
	if hw.AccelerationEnabled && hw.AccelerationType == "cuda" {
		// With CUDA active, GPU handles tensor contractions
		return 1, 4, true
	}

	// CPU execution: optimize without over-saturating memory bus
	threads = hw.CPUThreads
	if threads >= 8 {
		return 2, 4, false // 2 parallel chunks, 4 threads each
	} else if threads >= 4 {
		return 1, threads, false
	}
	return 1, 2, false
}
