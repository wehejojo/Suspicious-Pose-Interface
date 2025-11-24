pip install -r requirements.txt\
npm i


# Proposal: Suspicious Pose Detection System

**Prepared for:** Erick Brylle R. Relayo and Groupmates  
**Prepared by:** Johann Sebastian Philip V. Liwag  
**Date:** TBD 

---

## 1. Project Overview

This project delivers a **local-use Suspicious Pose Detection System**, combining AI pose detection and a full-stack web interface. The system allows office personnel to:  

- Detect suspicious human poses via webcam
- Visualize live or recorded pose data on a simple dashboard  
- Receive SMS alerts when suspicious poses are detected  

The project includes:  

1. **AI Model**: Pose-detection scripts, pre-processing, training instructions, and inference code  
2. **Frontend**: React-based web interface with login, dashboard, data visualization, and live camera feed  
3. **Backend**: Flask API with JWT authentication, connection to AI model, local data storage, and optional SMS notifications  

All components are **designed to run locally** on office computers. Deployment to cloud servers is not included, reducing complexity and cost.  

---

## 2. Features & Pricing

| Feature | Description | Price (₱) |
|---------|------------|------------|
| **Code to train AI model** | Scripts for data preprocessing, model training loop, and documentation | **6,000** |
|<br>
| **Frontend - Login Page** | React page for admin login with JWT authentication | 2,200 |
| **Frontend - Home Page** | Basic landing/dashboard entry point after login | 1,500 |
| **Frontend - Dashboard** | Admin dashboard showing metrics and AI model outputs | 2,800 |
| **Frontend - Data Visualization** | Charts and graphs showing processed model data | 2,800 |
| **Frontend - Live Camera Feed** | Live streaming of camera feed integrated with AI model | 3,500 |
|<br>
| **Backend - API Endpoints** | Flask endpoints for frontend communication and AI model inference | 3,500 |
| **Backend - JWT Auth** | User authentication system using JSON Web Tokens | 1,800 |
| **Backend - Basic Local JSON Storage** | Simple data storage solution for small datasets and logs | 1,500 |
| **Backend - Connection to AI Model** | Logic for sending input to model and returning predictions | 2,000 |
| **Backend - SMS Notifications** | Sends SMS alerts when suspicious poses are detected; configurable via Twilio or local SMS gateway | 1,500 |

**Total Cost:** ₱28,300  
**Agreed price for AI model portion:** ₱6,000  

---

## 3. Payment Terms

- **One-time payment** upon delivery of the full project  
- Cost **per student (3 students)**: 28,300 ÷ 3 ≈ **₱9,430 per student**  

---

## 4. Deliverables

1. Fully functional AI model code with training and inference scripts  
2. Frontend React application with login, dashboard, live camera feed, and visualizations  
3. Backend Flask API with JWT authentication, AI model integration, local JSON storage, and SMS notification functionality  
4. Complete documentation:
   - Installation guide  
   - Dataset preparation  
   - Training instructions  
   - Running and testing instructions  
   - Basic troubleshooting  
5. Initial support for local setup and verification  

---

## 5. Optional Add-ons (Future Upgrades)

- Additional dataset preprocessing and model retraining scripts  
- Extended post-delivery support (bug fixes or minor updates)  
- Advanced visualization features or multi-user dashboard  

---

## 6. Notes

- System is designed to run **locally**; no cloud deployment is included  
- Payment is **one-time** upon delivery  
- Students are responsible for providing hardware (office PC with webcam) and internet access for optional SMS notifications  

---
