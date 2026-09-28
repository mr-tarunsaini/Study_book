<?php
// 1. Extract the slug from the URL
$request_uri = $_SERVER['REQUEST_URI'];
$slug = '';
if (preg_match('/\/notes\/([^\/\?]+)/', $request_uri, $matches)) {
    $slug = urldecode($matches[1]);
}

// 2. Default Meta Tags
$title = "Study Material";
$description = "View, read, and download high-quality B.Tech study materials directly on Study Book.";

// 3. Fetch data from Firestore REST API if slug exists
if ($slug) {
    $fields = null;
    
    // 1. Try fetching directly by Document ID first
    $docUrl = "https://firestore.googleapis.com/v1/projects/studybook-15297/databases/(default)/documents/study_materials/" . urlencode($slug);
    $ch = curl_init($docUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Fixes SSL restrictions on InfinityFree
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode == 200 && $response) {
        $data = json_decode($response, true);
        if (isset($data['fields'])) {
            $fields = $data['fields'];
        }
    } else {
        // 2. Fallback: Query by slug field
        $queryUrl = "https://firestore.googleapis.com/v1/projects/studybook-15297/databases/(default)/documents/study_materials:runQuery";
        $queryPayload = [
            "structuredQuery" => [
                "from" => [["collectionId" => "study_materials"]],
                "where" => [
                    "fieldFilter" => [
                        "field" => ["fieldPath" => "slug"],
                        "op" => "EQUAL",
                        "value" => ["stringValue" => $slug]
                    ]
                ],
                "limit" => 1
            ]
        ];
        $ch2 = curl_init($queryUrl);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch2, CURLOPT_POST, true);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($queryPayload));
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
        $queryResponse = curl_exec($ch2);
        curl_close($ch2);

        if ($queryResponse) {
            $queryData = json_decode($queryResponse, true);
            if (isset($queryData[0]['document']['fields'])) {
                $fields = $queryData[0]['document']['fields'];
            }
        }
    }

    if ($fields) {
            $title = isset($fields['title']['stringValue']) ? $fields['title']['stringValue'] : $title;
        
        $type = isset($fields['type']['stringValue']) ? $fields['type']['stringValue'] : 'Document';
        $subject = isset($fields['subject']['stringValue']) ? $fields['subject']['stringValue'] : '';
        $course = isset($fields['course']['stringValue']) ? $fields['course']['stringValue'] : '';
        
        $details = ["PDF"];
        if ($type) $details[] = $type;
        if ($subject) $details[] = $subject;
        if ($course) $details[] = $course;
        
        $description = implode(" • ", $details);
    }
}

// 4. Load your existing viewer.html file
$html = file_get_contents(__DIR__ . '/viewer.html');

// 5. Inject the real details into the meta tags
$html = preg_replace('/<title>.*?<\/title>/i', "<title>" . htmlspecialchars($title) . " - Study Book</title>", $html);
$html = preg_replace('/<meta property="og:title" content=".*?">/i', '<meta property="og:title" content="' . htmlspecialchars($title) . ' - Study Book">', $html);
$html = preg_replace('/<meta property="og:description" content=".*?">/i', '<meta property="og:description" content="' . htmlspecialchars($description) . '">', $html);
$html = preg_replace('/<h1 class="v-doc-title".*?>.*?<\/h1>/i', '<h1 class="v-doc-title" title="' . htmlspecialchars($title) . '">' . htmlspecialchars($title) . '</h1>', $html);

$html = preg_replace('/<meta property="og:url" content=".*?">/i', '<meta property="og:url" content="https://studybook.gt.tc/notes/' . $slug . '">', $html);

// 6. Send the finished page to the user/WhatsApp
echo $html;
?>