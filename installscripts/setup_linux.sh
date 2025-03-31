#!/bin/bash

# LUKA Universal Setup Script for Linux

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect package manager and OS
detect_pkg_manager() {
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt-get"
        INSTALL_CMD="sudo apt-get install -y"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        INSTALL_CMD="sudo dnf install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        INSTALL_CMD="sudo yum install -y"
    elif command -v pacman &> /dev/null; then
        PKG_MANAGER="pacman"
        INSTALL_CMD="sudo pacman -S --noconfirm"
    elif command -v zypper &> /dev/null; then
        PKG_MANAGER="zypper"
        INSTALL_CMD="sudo zypper install -y"
    else
        echo -e "${RED}❌ Could not detect package manager!${NC}"
        exit 1
    fi
    echo -e "${BLUE}ℹ️ Detected package manager: ${PKG_MANAGER}${NC}"
}

# Install required system packages
install_system_packages() {
    local packages=("git" "wget" "bzip2" "gcc" "make")
    local missing_pkgs=()
    
    echo -e "${BLUE}🔍 Checking system dependencies...${NC}"
    
    for pkg in "${packages[@]}"; do
        if ! command -v "$pkg" &> /dev/null; then
            missing_pkgs+=("$pkg")
        fi
    done
    
    if [ ${#missing_pkgs[@]} -ne 0 ]; then
        echo -e "${YELLOW}⚠️ Missing packages: ${missing_pkgs[*]}${NC}"
        echo -e "${BLUE}🛠️ Installing missing packages...${NC}"
        if ! $INSTALL_CMD "${missing_pkgs[@]}"; then
            echo -e "${RED}❌ Failed to install system packages!${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✔️ All system dependencies are satisfied${NC}"
    fi
}

# Install Conda if not present
install_conda() {
    if ! command -v conda &> /dev/null; then
        echo -e "${YELLOW}⚠️ Conda not found. Installing Miniconda...${NC}"
        
        CONDA_DIR="$HOME/miniconda3"
        CONDA_INSTALLER="Miniconda3-latest-Linux-x86_64.sh"
        
        # Download Miniconda
        wget https://repo.anaconda.com/miniconda/$CONDA_INSTALLER -O /tmp/$CONDA_INSTALLER || {
            echo -e "${RED}❌ Failed to download Miniconda!${NC}"
            exit 1
        }
        
        # Install Miniconda
        bash /tmp/$CONDA_INSTALLER -b -p $CONDA_DIR || {
            echo -e "${RED}❌ Failed to install Miniconda!${NC}"
            exit 1
        }
        rm /tmp/$CONDA_INSTALLER
        
        # Initialize conda
        source "$CONDA_DIR/etc/profile.d/conda.sh"
        conda init bash
        source ~/.bashrc
        
        echo -e "${GREEN}✔️ Miniconda installed successfully${NC}"
    else
        echo -e "${GREEN}✔️ Conda is already installed${NC}"
    fi
}

# Main setup function
setup_luka() {
    echo -e "\n${GREEN}🚀 Starting LUKA universal setup...${NC}"
    
    # Detect package manager
    detect_pkg_manager
    
    # Install system dependencies
    install_system_packages
    
    
    # Install Conda
    install_conda
    
    # Initialize conda for this session
    source "$(conda info --base)/etc/profile.d/conda.sh"
    
    # Create or reuse Conda environment
    echo -e "\n${BLUE}🌍 Managing Conda environment...${NC}"
    if conda env list | grep -q "luka_env"; then
        echo -e "${GREEN}✔️ LUKA environment already exists${NC}"
        echo -e "${YELLOW}Would you like to recreate it? [y/N]${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            conda env remove -n luka_env -y
            conda create --name luka_env python=3.11.11 -y || {
                echo -e "${RED}❌ Failed to create Conda environment!${NC}"
                exit 1
            }
        fi
    else
        echo -e "${BLUE}🛠️ Creating LUKA environment...${NC}"
        conda create --name luka_env python=3.11.11 -y || {
            echo -e "${RED}❌ Failed to create Conda environment!${NC}"
            exit 1
        }
    fi
    
    # Activate environment
    echo -e "\n${BLUE}⚡ Activating environment...${NC}"
    conda activate luka_env || {
        echo -e "${RED}❌ Failed to activate Conda environment!${NC}"
        exit 1
    }
    
    # Install Python dependencies
    echo -e "\n${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118 || {
        echo -e "${RED}❌ Failed to install dependencies!${NC}"
        exit 1
    }
    
    # Verify installation
    echo -e "\n${BLUE}🔍 Verifying installations...${NC}"
    python -m flask --version || echo -e "${YELLOW}⚠️ Flask might not be installed correctly!${NC}"
    python -c "import torch; print(f'${GREEN}✔️ PyTorch Installed:${NC}', torch.__version__)" || echo -e "${YELLOW}⚠️ PyTorch installation might have issues!${NC}"
    
    # Complete
    echo -e "\n${GREEN}✅ Setup Complete!${NC}"
    echo -e "${GREEN}🌐 You can now start LUKA with:${NC}"
    echo -e "${BLUE}   cd calbi-luka${NC}"
    echo -e "${BLUE}   conda activate luka_env${NC}"
    echo -e "${BLUE}   python app.py${NC}"
    echo -e "${GREEN}Access LUKA on http://127.0.0.1:5500/${NC}"
}

# Run the setup
setup_luka
