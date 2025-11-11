import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const SERVER_URL = "https://famous-views-matter.loca.lt"; // replace with your Flask server URL

export default function App() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);

  // Request camera permissions on app start
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "Camera access is required to take photos."
          );
        }
      }
    })();
  }, []);

 const takePhoto = async () => {
  try {
    let pickerResult = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    console.log("Picker Result:", pickerResult); // Debug

    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri; // <-- updated
      setImage(uri);
      uploadPhoto(uri);
    } else {
      console.log("User cancelled the camera.");
    }
  } catch (error) {
    Alert.alert("Error", "Cannot open camera: " + error.message);
    console.log(error);
  }
};



  const uploadPhoto = async (uri) => {
    let formData = new FormData();
    let filename = uri.split('/').pop();
    let match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1]}` : `image`;

    formData.append('photo', {
      uri,
      name: filename,
      type,
    });

    try {
      const response = await fetch(`${SERVER_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      Alert.alert("Upload Failed", error.message);
      console.log(error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Food Photo PoC</Text>
      <Button title="Take Photo" onPress={takePhoto} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {result && (
        <View style={styles.result}>
          <Text>Total Calories: {result.total_calories}</Text>
          {result.ingredients.map((item, idx) => (
            <Text key={idx}>
              {item.name}: {item.calories_kcal} kcal
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 20,
  },
  result: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
});
