package whisper

import (
	"encoding/json"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"go-audio-play/internal/domain/study"
	"go-audio-play/internal/infrastructure/storage"
)

type videoControllerInfo struct {
	Name       string      `json:"Name"`
	AdapterRAM interface{} `json:"AdapterRAM"`
}

// DetectHardware interrogates the Windows system for video controllers, CPU topology, and storage
func DetectHardware(binDir string) study.HardwareInfo {
	info := study.HardwareInfo{
		GPUVendor:           "unknown",
		GPUName:             "Đồ họa tích hợp",
		VRAMMB:              0,
		VRAMGB:              0,
		CPUName:             "Bộ vi xử lý máy tính",
		CPUCores:            runtime.NumCPU(),
		CPUThreads:          runtime.NumCPU(),
		RAMMB:               8192,
		RAMGB:               8,
		AccelerationType:    "cpu_avx",
		AccelerationEnabled: false,
		RecommendedBackend:  "cpu",
		IsPortable:          storage.IsPortable(),
		DataDir:             storage.GetDataDir(),
	}

	if runtime.GOOS != "windows" {
		return info
	}

	// 1. Try NVIDIA-SMI directly for precise GPU Name and un-capped VRAM
	nCmd := exec.Command("nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits")
	setHideWindow(nCmd)
	if nOut, err := nCmd.Output(); err == nil && len(nOut) > 0 {
		parts := strings.Split(strings.TrimSpace(string(nOut)), ",")
		if len(parts) >= 2 {
			gpuName := strings.TrimSpace(parts[0])
			vramStr := strings.TrimSpace(parts[1])
			if vram, pErr := strconv.Atoi(vramStr); pErr == nil && vram > 0 {
				info.GPUVendor = "nvidia"
				info.GPUName = gpuName
				info.VRAMMB = vram
				info.VRAMGB = int(float64(vram)/1024.0 + 0.5)
				info.RecommendedBackend = "cuda"
			}
		}
	}

	// 2. If nvidia-smi didn't detect, fallback to Windows CIM for Video Controllers
	if info.GPUVendor == "unknown" {
		cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json")
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

				if strings.Contains(lower, "nvidia") || strings.Contains(lower, "geforce") || strings.Contains(lower, "rtx") || strings.Contains(lower, "gtx") {
					info.GPUVendor = "nvidia"
					info.GPUName = name
					info.VRAMMB = vram
					info.VRAMGB = int(float64(vram)/1024.0 + 0.5)
					info.RecommendedBackend = "cuda"
					break
				} else if strings.Contains(lower, "amd") || strings.Contains(lower, "radeon") {
					if info.GPUVendor != "nvidia" {
						info.GPUVendor = "amd"
						info.GPUName = name
						info.VRAMMB = vram
						info.VRAMGB = int(float64(vram)/1024.0 + 0.5)
						info.RecommendedBackend = "openblas"
					}
				} else if strings.Contains(lower, "intel") || strings.Contains(lower, "arc") || strings.Contains(lower, "iris") {
					if info.GPUVendor != "nvidia" && info.GPUVendor != "amd" {
						info.GPUVendor = "intel"
						info.GPUName = name
						info.VRAMMB = vram
						info.VRAMGB = int(float64(vram)/1024.0 + 0.5)
						info.RecommendedBackend = "openblas"
					}
				} else if info.GPUVendor == "unknown" {
					info.GPUName = name
					info.VRAMMB = vram
					info.VRAMGB = int(float64(vram)/1024.0 + 0.5)
				}
			}
		}
	}

	// 3. Query CPU Name and Total Physical RAM
	cpuCmd := exec.Command("powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name; (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory")
	setHideWindow(cpuCmd)
	if sysOut, err := cpuCmd.Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(sysOut)), "\n")
		if len(lines) >= 1 && strings.TrimSpace(lines[0]) != "" {
			info.CPUName = strings.TrimSpace(lines[0])
		}
		if len(lines) >= 2 {
			if totalBytes, err := strconv.ParseInt(strings.TrimSpace(lines[1]), 10, 64); err == nil && totalBytes > 0 {
				info.RAMMB = int(totalBytes / (1024 * 1024))
				info.RAMGB = int(totalBytes / (1024 * 1024 * 1024))
			}
		}
	}

	// 4. Check installed acceleration libraries in any bin search dir
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
	isCUDAActive := hw.AccelerationEnabled && hw.AccelerationType == "cuda"
	has6GBVRAM := hw.VRAMGB >= 6 || hw.VRAMMB >= 5500

	switch m.ID {
	case "tiny":
		return "good", "Mô hình nhỏ nhất (~75MB), tốc độ cực nhanh, thích hợp nghe lướt nhanh."
	case "base":
		if !isCUDAActive {
			return "perfect", "🌟 Đề xuất tốt nhất cho CPU: Phản hồi tức thì, không gây nóng máy."
		}
		return "good", "Tốc độ chớp nhoáng trên GPU."
	case "small":
		return "good", "Cân bằng tốt giữa tốc độ và độ chính xác bắt từ vựng thông dụng."
	case "medium":
		if isCUDAActive {
			return "good", "Chuyên sâu nhận diện ngữ pháp khó, GPU xử lý mượt mà."
		}
		return "heavy", "Hơi nặng trên CPU thuần, nên dùng Turbo hoặc kích hoạt GPU."
	case "large-v3-turbo-q5_0":
		if isCUDAActive {
			return "perfect", "🌟 Đề xuất số 1 cho máy bạn: GPU " + hw.GPUName + " (" + strconv.Itoa(hw.VRAMGB) + "GB VRAM) xử lý siêu tốc, độ chuẩn 99%."
		}
		if hw.CPUThreads >= 8 {
			return "perfect", "🌟 Khuyên dùng: Kiến trúc 4 tầng giải mã tối ưu đa luồng CPU, nhận diện rất chuẩn."
		}
		return "good", "Độ chính xác rất cao, thời gian xử lý hợp lý."
	case "large-v3-q5_0":
		if isCUDAActive && has6GBVRAM {
			return "good", "Độ chính xác đỉnh cao (99.6%) cho accent khó. GPU " + strconv.Itoa(hw.VRAMGB) + "GB của bạn chạy tốt."
		}
		return "heavy", "⚠️ Mô hình 32 tầng rất nặng (~1.1GB). Khuyên dùng bản Turbo để nhanh hơn gấp 8 lần."
	default:
		return "good", "Mô hình tùy chỉnh"
	}
}

// GetOptimalWhisperArgs computes thread count and processors
func GetOptimalWhisperArgs(hw study.HardwareInfo) (processors int, threads int, useGPU bool) {
	if hw.AccelerationEnabled && hw.AccelerationType == "cuda" {
		// With CUDA active, GPU handles tensor multiplications
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
