<#
.LUKA Universal Setup Script for Windows (PowerShell)

.DESCRIPTION
This script automates the setup of LUKA on Windows systems, including:
- System dependency checks
- Conda installation
- Python environment setup
- Package installation
#>

# Color codes
$RED = "`e[0;31m"
$GREEN = "`e[0;32m"
$YELLOW = "`e[1;33m"
$BLUE = "`e[0;34m"
$NC = "`e[0m" # No Color

# Function to check if a command exists
function Test-CommandExists {
    param($command)
    try {
        Get-Command $command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Install Chocolatey if not present
function Install-Chocolatey {
    if (-not (Test-CommandExists "choco")) {
        Write-Host "${YELLOW}⚠️ Chocolatey not found. Installing Chocolatey...${NC}"
        
        # Set execution policy
        Set-ExecutionPolicy Bypass -Scope Process -Force
        
        # Install Chocolatey
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        if (-not (Test-CommandExists "choco")) {
            Write-Host "${RED}❌ Failed to install Chocolatey!${NC}"
            exit 1
        }
        
        Write-Host "${GREEN}✔️ Chocolatey installed successfully${NC}"
    } else {
        Write-Host "${GREEN}✔️ Chocolatey is already installed${NC}"
    }
}

# Install required system packages
function Install-SystemPackages {
    $packages = @("git", "wget", "7zip", "visualstudio2019buildtools", "python")
    $missing = @()
    
    Write-Host "${BLUE}🔍 Checking system dependencies...${NC}"
    
    foreach ($pkg in $packages) {
        if (-not (Test-CommandExists $pkg)) {
            $missing += $pkg
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "${YELLOW}⚠️ Missing packages: $($missing -join ', ')${NC}"
        Write-Host "${BLUE}🛠️ Installing missing packages...${NC}"
        
        foreach ($pkg in $missing) {
            choco install $pkg -y --no-progress
            if (-not (Test-CommandExists $pkg)) {
                Write-Host "${RED}❌ Failed to install $pkg!${NC}"
                exit 1
            }
        }
    } else {
        Write-Host "${GREEN}✔️ All system dependencies are satisfied${NC}"
    }
}

# Install Conda if not present
function Install-Conda {
    if (-not (Test-CommandExists "conda")) {
        Write-Host "${YELLOW}⚠️ Conda not found. Installing Miniconda...${NC}"
        
        $condaInstaller = "Miniconda3-latest-Windows-x86_64.exe"
        $condaUrl = "https://repo.anaconda.com/miniconda/$condaInstaller"
        $installPath = "$env:USERPROFILE\Miniconda3"
        
        # Download Miniconda
        Invoke-WebRequest -Uri $condaUrl -OutFile "$env:TEMP\$condaInstaller"
        
        # Install Miniconda
        Start-Process -Wait -FilePath "$env:TEMP\$condaInstaller" -ArgumentList "/InstallationType=JustMe /AddToPath=1 /RegisterPython=1 /S /D=$installPath"
        Remove-Item "$env:TEMP\$condaInstaller"
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (-not (Test-CommandExists "conda")) {
            Write-Host "${RED}❌ Failed to install Miniconda!${NC}"
            exit 1
        }
        
        Write-Host "${GREEN}✔️ Miniconda installed successfully${NC}"
    } else {
        Write-Host "${GREEN}✔️ Conda is already installed${NC}"
    }
}

# Main setup function
function Setup-Luka {
    Write-Host "${GREEN}🚀 Starting LUKA universal setup...${NC}"
    
    # Install Chocolatey
    Install-Chocolatey
    
    # Install system dependencies
    Install-SystemPackages
    
    # Install Conda
    Install-Conda
    
    # Create or reuse Conda environment
    Write-Host "${BLUE}🌍 Managing Conda environment...${NC}"
    $envExists = conda env list | Select-String "luka_env"
    
    if ($envExists) {
        Write-Host "${GREEN}✔️ LUKA environment already exists${NC}"
        $response = Read-Host "${YELLOW}Would you like to recreate it? [y/N]${NC}"
        if ($response -match "^[yY]$") {
            conda env remove -n luka_env -y
            conda create --name luka_env python=3.11.11 -y
            if (-not $?) {
                Write-Host "${RED}❌ Failed to create Conda environment!${NC}"
                exit 1
            }
        }
    } else {
        Write-Host "${BLUE}🛠️ Creating LUKA environment...${NC}"
        conda create --name luka_env python=3.11.11 -y
        if (-not $?) {
            Write-Host "${RED}❌ Failed to create Conda environment!${NC}"
            exit 1
        }
    }
    
    # Activate environment
    Write-Host "${BLUE}⚡ Activating environment...${NC}"
    conda activate luka_env
    if (-not $?) {
        Write-Host "${RED}❌ Failed to activate Conda environment!${NC}"
        exit 1
    }
    
    # Install Python dependencies
    Write-Host "${BLUE}📦 Installing Python dependencies...${NC}"
    pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118
    if (-not $?) {
        Write-Host "${RED}❌ Failed to install dependencies!${NC}"
        exit 1
    }
    
    # Verify installation
    Write-Host "${BLUE}🔍 Verifying installations...${NC}"
    python -m flask --version
    if (-not $?) {
        Write-Host "${YELLOW}⚠️ Flask might not be installed correctly!${NC}"
    }
    
    python -c "import torch; print(f'${GREEN}✔️ PyTorch Installed:${NC}', torch.__version__)"
    if (-not $?) {
        Write-Host "${YELLOW}⚠️ PyTorch installation might have issues!${NC}"
    }
    
    # Complete
    Write-Host "${GREEN}✅ Setup Complete!${NC}"
    Write-Host "${GREEN}🌐 You can now start LUKA with:${NC}"
    Write-Host "${BLUE}   cd calbi-luka${NC}"
    Write-Host "${BLUE}   conda activate luka_env${NC}"
    Write-Host "${BLUE}   python app.py${NC}"
    Write-Host "${GREEN}Access LUKA on http://127.0.0.1:5500/${NC}"
}

# Run the setup
Setup-Luka
