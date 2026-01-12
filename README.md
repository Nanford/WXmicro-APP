# AI Rainbow (AI彩虹老师) - WeChat Mini Program

## Project Setup & Testing

This project is a WeChat Mini Program (微信小程序). To run and test it, you need the **WeChat Developer Tools**.

### Prerequisites

-   Download and install [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).
-   A WeChat AppID (optional for testing, you can use a Test ID).

### How to Run

1.  **Open WeChat Developer Tools**.
2.  Click on the **"Plus" (+)** icon or select **"Import Project"**.
3.  **Directory**: Select the folder `c:\Users\nanfo\Desktop\AI-microapp`.
4.  **AppID**: 
    -   If you have one, enter it.
    -   If not, click **"Test AppID" (测试号)** to generate a temporary one.
5.  **Backend Mode**: Since this project uses a Mock API by default (configured in `utils/request.js`), you do **not** need a running backend server.
6.  Click **"Compile" (编译)** to build the project.

### Testing Features

-   **Login**: Click "WeChat One-Click Login". Note: Since real phone number acquisition requires a valid non-personal AppID and backend, this may fail on Test IDs. Use **"Guest Login" (暂不登录)** for quick testing.
-   **Chat**: Navigate to the chat page to test the AI interaction (simulated).
-   **Calendar**: Check the mood tracking and chart rendering.
-   **Assessment**: Browse the list and view details.

### Troubleshooting

-   If you see "request:fail url not in domain list": enable **"Does not verify valid domain names..." (不校验合法域名...)** in "Local Settings" (右上角详情 -> 本地设置).
