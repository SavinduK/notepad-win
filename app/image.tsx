import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImageView() {
  const { path } = useLocalSearchParams<{ path: string }>();

  const [img, setImg] = useState('');   // filename
  const [fullPath, setFullPath] = useState(''); // full file path

  useEffect(() => {
    if (path) {
      const fileName = path.substring(path.lastIndexOf('/') + 1);
      const dir = path.substring(0, path.lastIndexOf('/'));
      setImg(fileName);
      setFullPath(path);
    }
  }, [path]);



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headingRow}>
        <FontAwesome5 name='image' size={20} color='#555' />
           <Text style={styles.title}>{img} - NotePad</Text>
      </View>
      <Image source={{ uri: fullPath }} resizeMode="contain" style={styles.image} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 5, backgroundColor: '#f0f0f0' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  headingRow: { flexDirection: 'row', justifyContent: 'flex-start', padding: 10, margin: 20, gap: 10 },
  image: { width: '100%', height: '80%', },
  input: { flex: 1,  backgroundColor: '#f0f0f0' },
});
