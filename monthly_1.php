<?php 


$datasource = ""; 
$month = "";
$station = "";

if (isset($_GET['datasource'])) {
    $datasource = $_GET['datasource'];
} 

if (isset($_GET['month'])) {
    $temp_month = explode("-",$_GET['month']);
    if($temp_month[1]<1 || $temp_month[1]>12){
        $datasource = "";
        echo "DATE_NOT_VALID";
    }
    if($temp_month[0]<1000 || $temp_month[1]>9999){
        $datasource = "";
        echo "DATE_NOT_VALID";
    }
    $month = $_GET['month'];
} 

// if (isset($_GET['station'])) {
//     $temp_station = $_GET['station'];
//     $station_pattern = "/[A-Z0-9a-z]+/";
//     if(preg_match_all($station_pattern,$temp_station)!=1){
//         $datasource = "";
//         echo "STATION_NOT_VALID";
//     }else{
//         $station = $_GET['station'];
//     }
// }


$url = "";

switch($datasource){
    case 'openaq':
        if(file_exists('/home/rprasai/openaq/monthly_records/openaq_'.$month.'.csv')){
            $url = "/home/rprasai/openaq/monthly_records/openaq_".$month.".csv";
        }
        break;
    case 'clarity_nasa_node':
        if(file_exists('/home/rprasai/clarity/monthly_records/NASA_node_'.$month.'.csv')){
            $url = "/home/rprasai/clarity/monthly_records/NASA_node_".$month.".csv";
        }
        break;
    case 'clarity_open_node':
        if(file_exists('/home/rprasai/clarity/monthly_records/open_node_'.$month.'.csv')){
            $url = "/home/rprasai/clarity/monthly_records/open_node_".$month.".csv";
        }
        break;
}

if($url!=""){
    $response = file_get_contents($url,false,$context);
    echo $response;
}

?>