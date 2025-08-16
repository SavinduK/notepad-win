import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ImageView(){
    const { path } = useLocalSearchParams<{ path: string }>();

    const [uri, setUri] = useState('');//directory
    const [img, setImg] = useState('');//image
        
     useEffect(() => {
        if (path) {
            setImg(path.substring(path.lastIndexOf('/') + 1))
            setUri(path.substring(0,path.lastIndexOf('/')))
             }
    }, [path]);

    return(
        <SafeAreaView style={styles.container}>
             <View style={styles.headingRow}>
                <FontAwesome5 name='image' size={20} color='#555' />
                <Text style={styles.title}>{img} - NotePad</Text>
             </View>
             <Image source={{ uri: path }} resizeMode="contain" style={styles.image}/>
        </SafeAreaView>     
    )
}

const styles = StyleSheet.create({
     container:{flex: 1, padding:5, backgroundColor: '#f0f0f0', fontFamily:'System'},
     title: {fontSize: 16, fontWeight: 'bold', color:'#555', fontFamily:'System'},
     headingRow :{flexDirection:'row', justifyContent:'flex-start', padding:10, margin:20, gap:10},
     image:{width:'100%',height:'80%',padding:20},
})