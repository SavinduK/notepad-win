import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const [fileName, setFileName] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isFocused, setFocus] = useState(false);
  const [fileList, setFileList] = useState<string[]>([]);
  const [folderList, setFolderList] = useState<string[]>([]);
  const root  = FileSystem.documentDirectory + 'Notes/'
  const [currentDir, setCurrentDir] = useState(root || '');
  const { path } = useLocalSearchParams<{ path: string }>();

  const router = useRouter();

  //setup notes directory to save all files
  useEffect(() => {
  const setupNotesDir = async () => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(root);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(root, { intermediates: true });
        console.log("Notes directory created:", root);
      }
      setCurrentDir(root);
      refreshData();
    } catch (error) {
      console.error("Error setting up notes directory:", error);
    }
  };
  setupNotesDir();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const items = await FileSystem.readDirectoryAsync(currentDir);
      const fileUris: string[] = [];
      const folderUris: string[] = [];

      await Promise.all(
        items.map(async (item) => {
          const fullPath = currentDir + item;
          const info = await FileSystem.getInfoAsync(fullPath);
          if (info.isDirectory) {
            folderUris.push(fullPath);
          } else {
            const lower = item.toLowerCase();
            if (
              lower.endsWith('.txt') ||
              lower.endsWith('.jpg') ||
              lower.endsWith('.jpeg') ||
              lower.endsWith('.png') ||
              lower.endsWith('.heic')
            ) {
              fileUris.push(fullPath);
            }
          }
        })
      );

      folderUris.sort((a, b) => a.split('/').pop()!.localeCompare(b.split('/').pop()!));
      fileUris.sort((a, b) => a.split('/').pop()!.localeCompare(b.split('/').pop()!));

      setFolderList(folderUris);
      setFileList(fileUris);
    } catch (error) {
      console.error('Error reading directory:', error);
    }
  }, [currentDir]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    if (path) {
      setCurrentDir(path + '/');
    }
  }, [path]);

  const openFile = (uri: string) => {
    const filename = uri.split('/').pop()!;
    const lower = filename.toLowerCase();
    const encodedPath = encodeURIComponent(uri);

    if (lower.endsWith('.txt')) {
      router.push(`/note?path=${encodedPath}`);
    } else if (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.heic')
    ) {
      router.push(`/image?path=${encodedPath}`);
    }
  };

  const openFolder = (uri: string) => {
    setCurrentDir(uri.endsWith('/') ? uri : uri + '/');
  };

  const loadPrevious = () => {
    if (currentDir === root) {
      console.log("Already at root");
      refreshData();
      return;
    }
    const cleanUri = currentDir.endsWith('/') ? currentDir.slice(0, -1) : currentDir;
    const lastSlashIndex = cleanUri.lastIndexOf('/');
    setCurrentDir(cleanUri.slice(0, lastSlashIndex + 1));
  };

 const deleteItem = async (uri: string) => {
  Alert.alert(
    "Delete Confirmation",
    "Are you sure you want to delete this item?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            await refreshData();
            console.log("Deleted:", uri);
          } catch (error) {
            console.error("Error deleting item:", error);
          }
        },
      },
    ],
    { cancelable: true }
  );
};
  const createFile = async () => {
    if (!fileName.trim()) {
      Alert.alert("File name cannot be empty");
      return;
    }
    try {
      await FileSystem.writeAsStringAsync(`${currentDir}${fileName}.txt`, '', {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setFileName('');
      refreshData();
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const createFolder = async () => {
    if (!fileName.trim()) {
      Alert.alert("Folder name cannot be empty");
      return;
    }
    try {
      await FileSystem.makeDirectoryAsync(`${currentDir}${fileName}`, { intermediates: true });
      setFileName('');
      refreshData();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/jpg', 'image/heic', 'image/png'],
        copyToCacheDirectory: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const destinationUri = currentDir + file.name;
        await FileSystem.copyAsync({
          from: file.uri,
          to: destinationUri
        });
        refreshData();
      }
    } catch (error) {
      console.error('Error picking or copying image:', error);
    }
  };

  const shareFile = async (uri: string) => {
  if (isSharing) return;
  setIsSharing(true);

  try {
    const fileExists = await FileSystem.getInfoAsync(uri);
    if (!fileExists.exists) {
      console.log('[File not found]');
      return;
    }

    const lower = uri.toLowerCase();

    if (lower.endsWith('.txt')) {
      // Convert text file to PDF before sharing
      const text = await FileSystem.readAsStringAsync(uri);
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: `<pre style="font-size: 25px; font-family: monospace; font-weight: bold">${text}</pre>`,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share My Text File",
        });
      } else {
        console.log("Sharing not available");
      }
    } else if (
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.heic')
    ) {
      // Share image directly
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/*",
          dialogTitle: "Share Image",
        });
      } else {
        console.log("Sharing not available");
      }
    } else {
      console.log("Unsupported file type for sharing");
    }
  } catch (error) {
    console.error("Error sharing file:", error);
  } finally {
    setIsSharing(false);
  }
};
  //trim full path and only view necessary path
  const getRelativePath = (path: string) => {
  if (!path) return "";
  return path.replace(FileSystem.documentDirectory || "", "");
  };

  const renderList = (list: string[], isFolder: boolean) => {
    if (!list.length) {
      return <Text style={styles.text}>No {isFolder ? 'folders' : 'files'} found.</Text>;
    }
    return list.map((uri, index) => {
      const name = uri.split('/').pop()!;
      const lower = name.toLowerCase();
      let iconName: any = 'file-alt';
      let iconColor = "#75c197";

      if (isFolder) {
        iconName = 'folder';
        iconColor = "#f4c542";
      } else if (
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.heic')
      ) {
        iconName = 'image';
        iconColor = "#a676f4";
      }

      return (
        <View key={index} style={styles.fileItem}>
          <View style={styles.iconTextRow}>
            <FontAwesome5 name={iconName} size={20} color={iconColor} />
            <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
          </View>
          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => isFolder ? openFolder(uri) : openFile(uri)}>
              <FontAwesome5 name='marker' size={24} color="#3b88b8" />
            </Pressable>
            <Pressable style={styles.button} onPress={() => deleteItem(uri)}>
              <FontAwesome5 name='trash' size={24} color="#e57373" />
            </Pressable>
            {!isFolder  && (
              <Pressable style={styles.button} onPress={() => shareFile(uri)}>
                <Ionicons name='share-social' size={24} color="#555" />
              </Pressable>
            )}
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.mainTitle}>My Notes</Text>

      <View style={styles.inputRow}>
        {!isFocused && !fileName && (
          <Text style={styles.placeholder}>Create New File...</Text>
        )}
        <TextInput
          value={fileName}
          onChangeText={setFileName}
          style={styles.input}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
        />
        <Pressable style={styles.button} onPress={createFolder}>
          <FontAwesome5 name='folder-plus' size={30} color="#75c197" />
        </Pressable>
        <Pressable style={styles.button} onPress={createFile}>
          <FontAwesome5 name='file-medical' size={30} color="#75c197" />
        </Pressable>
        <Pressable style={styles.button} onPress={pickImage}>
          <FontAwesome5 name='images' size={25} color="#75c197" />
        </Pressable>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={loadPrevious}>
          <FontAwesome5 name='arrow-left' size={30} color="#555" />
        </Pressable>
        <Text style={styles.title}>{getRelativePath(currentDir)}</Text>
      </View>

      <ScrollView style={styles.scroll}>
        {renderList(folderList, true)}
        {renderList(fileList, false)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#555' },
  mainTitle: { fontSize: 25, fontWeight: 'bold', marginBottom: 20, marginLeft: '5%', marginTop: '5%', color: '#555' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, gap: 10, width: '100%', padding: 10, borderRadius: 20, justifyContent: 'space-between', borderColor: '#ccc', borderWidth: 2 },
  input: { flex: 1, borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 5, padding: 10 },
  placeholder: { position: "absolute", left: '10%', top: "40%", fontSize: 18, fontWeight: 'bold', color: '#555' },
  scroll: { flex: 1 },
  fileItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, width: '100%', borderColor: '#ccc', borderWidth: 2, padding: 10, borderRadius: 20, alignItems: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'flex-start', gap: '10%' },
  button: { padding: 5, borderRadius: 5 },
  text: {flex:1, fontSize: 17, fontWeight: 'bold', color: '#555', marginLeft: 8,marginRight:10 },
  iconTextRow: { flexDirection: 'row', alignItems: 'center', flex: 1 }
});
