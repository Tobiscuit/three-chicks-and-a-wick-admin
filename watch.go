package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/fsnotify/fsnotify"
)

// List of directories and files to ignore completely.
var ignoreList = []string{
	".git",
	"node_modules",
	".vscode",
	".cursor-workspace",
	"dist",
	"build",
	"__pycache__",
	"watch.go",
	"go.mod",
	"go.sum",
	".next",
	"directory-trees.txt", // Don't include the output file in itself
}

const configFileName = "watch-config.json"
const outputFileName = "directory-trees.txt"

type Config struct {
	Directories []string `json:"directories"`
}

func main() {
	config, err := loadConfig()
	if err != nil {
		log.Println("No config file found. Starting interactive setup.")
		config, err = interactiveSetup()
		if err != nil {
			log.Fatalf("Error during interactive setup: %v", err)
		}
		if err := saveConfig(config); err != nil {
			log.Fatalf("Error saving config file: %v", err)
		}
	}

	if len(config.Directories) == 0 {
		log.Fatal("No directories to watch. Please add directories to watch-config.json or run interactive setup.")
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Error creating watcher:", err)
	}
	defer watcher.Close()

	for _, dir := range config.Directories {
		log.Printf("Adding watcher for directory: %s\n", dir)
		err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if info.IsDir() {
				for _, item := range ignoreList {
					if info.Name() == item {
						return filepath.SkipDir
					}
				}
				return watcher.Add(path)
			}
			return nil
		})
		if err != nil {
			log.Printf("Error walking directory tree for %s: %v\n", dir, err)
		}
	}

	log.Println("Performing initial directory tree generation...")
	generateAllTrees(config.Directories)

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Has(fsnotify.Create) || event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
					log.Printf("Change detected: %s. Regenerating all trees...\n", event.Name)
					generateAllTrees(config.Directories)
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("Watcher error:", err)
			}
		}
	}()

	done := make(chan os.Signal, 1)
	signal.Notify(done, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Watching for file changes. Press Ctrl+C to exit.")
	<-done
	log.Println("Shutting down watcher.")
}

func loadConfig() (Config, error) {
	var config Config
	file, err := os.Open(configFileName)
	if err != nil {
		return config, err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	return config, err
}

func interactiveSetup() (Config, error) {
	var config Config
	config.Directories = append(config.Directories, ".") // Automatically add the current directory
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("The current directory has been added by default.")
	fmt.Println("Enter any other directories you want to watch (relative or absolute paths, one per line, empty line to finish):")

	for {
		fmt.Print("> ")
		input, err := reader.ReadString('\n')
		if err != nil {
			return config, err
		}
		input = strings.TrimSpace(input)
		if input == "" {
			break
		}
		config.Directories = append(config.Directories, input)
	}
	return config, nil
}

func saveConfig(config Config) error {
	file, err := os.Create(configFileName)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	return encoder.Encode(config)
}

func generateAllTrees(directories []string) {
	var allTreesBuilder strings.Builder
	for _, dir := range directories {
		tree, err := generateSingleTree(dir)
		if err != nil {
			log.Printf("Error generating tree for %s: %v\n", dir, err)
			continue
		}
		allTreesBuilder.WriteString(tree)
		allTreesBuilder.WriteString("\n---\n\n") // Separator
	}

	// Print the combined tree to the console
	fmt.Println(allTreesBuilder.String())

	// Write the combined tree to the output file
	err := os.WriteFile(outputFileName, []byte(allTreesBuilder.String()), 0644)
	if err != nil {
		log.Printf("Error writing to %s: %v\n", outputFileName, err)
	} else {
		log.Printf("Successfully updated %s\n", outputFileName)
	}
}

func generateSingleTree(rootDir string) (string, error) {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("Directory: %s\n", rootDir))

	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if path == rootDir {
			return nil
		}

		for _, item := range ignoreList {
			if strings.Contains(path, filepath.FromSlash("/"+item)) || info.Name() == item {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}

		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return err
		}

		depth := len(strings.Split(relPath, string(os.PathSeparator)))
		indent := strings.Repeat("│   ", depth-1)

		parentDir := filepath.Dir(path)
		entries, _ := os.ReadDir(parentDir)
		isLast := info.Name() == entries[len(entries)-1].Name()

		prefix := "├── "
		if isLast {
			prefix = "└── "
		}

		builder.WriteString(fmt.Sprintf("%s%s%s\n", indent, prefix, info.Name()))

		return nil
	})

	if err != nil {
		return "", err
	}

	return builder.String(), nil
}